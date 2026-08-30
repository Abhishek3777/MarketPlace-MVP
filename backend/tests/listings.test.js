import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { registerUser } from '../src/services/auth.service.js';
import { UserRole, ListingStatus } from '../src/constants/roles.js';

describe('Phase 4 Listings Tests', () => {
  let server;
  let baseUrl;

  let seller1, seller1Token;
  let seller2, seller2Token;
  let buyer1, buyer1Token;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    const randomSuffix = Math.random().toString(36).substring(7);

    const s1 = await registerUser({
      name: 'Listings Seller 1',
      email: `listing_s1_${randomSuffix}@test.com`,
      password: 'Password123!',
      role: UserRole.SELLER,
    });
    seller1 = s1.user;
    seller1Token = s1.token;

    const s2 = await registerUser({
      name: 'Listings Seller 2',
      email: `listing_s2_${randomSuffix}@test.com`,
      password: 'Password123!',
      role: UserRole.SELLER,
    });
    seller2 = s2.user;
    seller2Token = s2.token;

    const b1 = await registerUser({
      name: 'Listings Buyer 1',
      email: `listing_b1_${randomSuffix}@test.com`,
      password: 'Password123!',
      role: UserRole.BUYER,
    });
    buyer1 = b1.user;
    buyer1Token = b1.token;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  describe('POST /api/listings (Create Listing)', () => {
    it('should allow a SELLER to create an ACTIVE listing (201 Created)', async () => {
      const res = await fetch(`${baseUrl}/api/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seller1Token}`,
        },
        body: JSON.stringify({
          title: 'Premium Developer Newsletter Sponsorship',
          description: 'Reach 35k senior full-stack developers with a featured mention in our weekly newsletter.',
          price: 199.99,
          category: 'Newsletters',
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.listing.title, 'Premium Developer Newsletter Sponsorship');
      assert.strictEqual(Number(json.data.listing.price), 199.99);
      assert.strictEqual(json.data.listing.status, ListingStatus.ACTIVE);
      assert.strictEqual(json.data.listing.sellerId, seller1.id);
    });

    it('should reject listing creation by a BUYER (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyer1Token}`,
        },
        body: JSON.stringify({
          title: 'Buyer Attempted Listing',
          description: 'This listing creation attempt should be blocked by RBAC.',
          price: 50.0,
          category: 'General',
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Forbidden: Role 'BUYER' is not authorized/i);
    });

    it('should reject unauthenticated listing creation (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/api/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Unauthenticated Listing',
          description: 'This listing creation should fail with 401.',
          price: 50.0,
          category: 'General',
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(json.success, false);
    });

    it('should reject invalid listing data (negative price, short description, missing title) with 400', async () => {
      const res = await fetch(`${baseUrl}/api/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seller1Token}`,
        },
        body: JSON.stringify({
          title: '',
          description: 'Short',
          price: -25.5,
          category: '',
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(json.success, false);
      assert.ok(Array.isArray(json.error.details));
    });
  });

  describe('GET /api/listings (Browse Active Listings)', () => {
    it('should allow public/buyer browsing of ACTIVE listings (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/listings`);
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data.listings));
      assert.ok(json.data.listings.length > 0);
      json.data.listings.forEach((listing) => {
        assert.strictEqual(listing.status, ListingStatus.ACTIVE);
        assert.ok(listing.seller.name);
      });
    });

    it('should filter active listings by category (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/listings?category=Newsletters`);
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.ok(json.data.listings.length > 0);
      json.data.listings.forEach((listing) => {
        assert.strictEqual(listing.category, 'Newsletters');
      });
    });
  });

  describe('GET /api/listings/:id (Listing Details)', () => {
    let createdListing;

    before(async () => {
      createdListing = await prisma.listing.create({
        data: {
          sellerId: seller1.id,
          title: 'Listing Details Test Item',
          description: 'A detailed description for individual listing view tests.',
          price: 120.0,
          category: 'Test Details',
          status: ListingStatus.ACTIVE,
        },
      });
    });

    it('should return listing details including seller information (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/listings/${createdListing.id}`);
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.listing.id, createdListing.id);
      assert.strictEqual(json.data.listing.seller.id, seller1.id);
      assert.strictEqual(json.data.listing.seller.name, seller1.name);
    });

    it('should return 404 for non-existent listing ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await fetch(`${baseUrl}/api/listings/${nonExistentId}`);
      const json = await res.json();

      assert.strictEqual(res.status, 404);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Listing not found/i);
    });
  });

  describe('GET /api/listings/seller/my (Seller Dashboard View)', () => {
    it('should return all listings owned by authenticated seller (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/listings/seller/my`, {
        headers: { Authorization: `Bearer ${seller1Token}` },
      });
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data.listings));
      json.data.listings.forEach((listing) => {
        assert.strictEqual(listing.sellerId, seller1.id);
      });
    });

    it('should reject access to /api/listings/seller/my by a BUYER (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/listings/seller/my`, {
        headers: { Authorization: `Bearer ${buyer1Token}` },
      });
      const json = await res.json();

      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
    });
  });

  describe('PUT /api/listings/:id (Edit Listing)', () => {
    let editableListing;

    before(async () => {
      editableListing = await prisma.listing.create({
        data: {
          sellerId: seller1.id,
          title: 'Original Title Before Edit',
          description: 'Original description before any edit occurs.',
          price: 50.0,
          category: 'Original Category',
          status: ListingStatus.ACTIVE,
        },
      });
    });

    it('should allow the owner seller (Seller 1) to edit the listing (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/listings/${editableListing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seller1Token}`,
        },
        body: JSON.stringify({
          title: 'Updated Title By Seller 1',
          price: 75.5,
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.listing.title, 'Updated Title By Seller 1');
      assert.strictEqual(Number(json.data.listing.price), 75.5);
    });

    it('should prevent Seller 2 from editing Seller 1 listing (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/listings/${editableListing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seller2Token}`,
        },
        body: JSON.stringify({
          title: 'Malicious Edit By Seller 2',
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /do not have permission to modify or deactivate this listing/i);
    });
  });

  describe('DELETE /api/listings/:id (Soft Deactivation)', () => {
    let listingToDeactivate;

    before(async () => {
      listingToDeactivate = await prisma.listing.create({
        data: {
          sellerId: seller1.id,
          title: 'Listing To Be Soft Deactivated',
          description: 'This listing will be marked INACTIVE rather than hard deleted.',
          price: 80.0,
          category: 'Deactivation Tests',
          status: ListingStatus.ACTIVE,
        },
      });
    });

    it('should prevent Seller 2 from deactivating Seller 1 listing (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/listings/${listingToDeactivate.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${seller2Token}` },
      });

      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /do not have permission to modify or deactivate this listing/i);
    });

    it('should allow Seller 1 to soft-deactivate their listing (200 OK -> status INACTIVE)', async () => {
      const res = await fetch(`${baseUrl}/api/listings/${listingToDeactivate.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${seller1Token}` },
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.listing.status, ListingStatus.INACTIVE);
    });

    it('should NOT include deactivated (INACTIVE) listings in the public marketplace browse endpoint', async () => {
      const res = await fetch(`${baseUrl}/api/listings`);
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      const found = json.data.listings.find((l) => l.id === listingToDeactivate.id);
      assert.strictEqual(found, undefined, 'Deactivated listing must not appear in public marketplace');
    });

    it('should still show the INACTIVE listing in Seller 1 own listings dashboard', async () => {
      const res = await fetch(`${baseUrl}/api/listings/seller/my`, {
        headers: { Authorization: `Bearer ${seller1Token}` },
      });
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      const found = json.data.listings.find((l) => l.id === listingToDeactivate.id);
      assert.ok(found, 'Deactivated listing must remain visible in seller own management dashboard');
      assert.strictEqual(found.status, ListingStatus.INACTIVE);
    });
  });
});
