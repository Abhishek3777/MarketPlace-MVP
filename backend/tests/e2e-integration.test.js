import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { UserRole, ListingStatus, OrderStatus } from '../src/constants/roles.js';

describe('Phase 8 Full Integration & Hardening Suite', () => {
  let server;
  let baseUrl;

  // Test Actors
  let buyerToken, buyerUser;
  let sellerToken, sellerUser;
  let adminToken, adminUser;
  let maliciousUserToken, maliciousUser;

  let createdListingId;
  let approvalOrderId;
  let rejectionOrderId;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    const timestamp = Date.now();

    // 1. Register Buyer
    const buyerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Buyer',
        email: `e2e_buyer_${timestamp}@test.com`,
        password: 'Password123!',
        role: UserRole.BUYER,
      }),
    });
    const buyerData = await buyerRes.json();
    buyerToken = buyerData.data.token;
    buyerUser = buyerData.data.user;

    // 2. Register Seller
    const sellerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Seller Agency',
        email: `e2e_seller_${timestamp}@test.com`,
        password: 'Password123!',
        role: UserRole.SELLER,
      }),
    });
    const sellerData = await sellerRes.json();
    sellerToken = sellerData.data.token;
    sellerUser = sellerData.data.user;

    // 3. Register Malicious / Unrelated User
    const malRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unrelated User',
        email: `e2e_unrelated_${timestamp}@test.com`,
        password: 'Password123!',
        role: UserRole.BUYER,
      }),
    });
    const malData = await malRes.json();
    maliciousUserToken = malData.data.token;
    maliciousUser = malData.data.user;

    // 4. Login Seeded Admin
    const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'Password123!',
      }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data.token;
    adminUser = adminData.data.user;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  describe('1. Full End-to-End Approval Lifecycle (Buyer -> Admin -> Seller -> Buyer)', () => {
    it('1.1: Seller creates an active listing', async () => {
      const res = await fetch(`${baseUrl}/api/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sellerToken}`,
        },
        body: JSON.stringify({
          title: 'Top Tier Podcast Sponsorship (30s Mid-Roll)',
          description: 'Reach 80k weekly active software engineering listeners with a host-read mid-roll spot.',
          price: 450.0,
          category: 'Podcast Ads',
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(json.data.listing.status, ListingStatus.ACTIVE);
      assert.strictEqual(Number(json.data.listing.price), 450.0);
      createdListingId = json.data.listing.id;
    });

    it('1.2: Buyer browses active marketplace and finds the listing', async () => {
      const res = await fetch(`${baseUrl}/api/listings?category=Podcast Ads`);
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      const found = json.data.listings.find((l) => l.id === createdListingId);
      assert.ok(found, 'Created listing must appear in marketplace browse');
    });

    it('1.3: Buyer views listing details', async () => {
      const res = await fetch(`${baseUrl}/api/listings/${createdListingId}`);
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.data.listing.id, createdListingId);
      assert.strictEqual(json.data.listing.seller.name, 'E2E Seller Agency');
    });

    it('1.4: Buyer places an order -> Status is PENDING with frozen amount', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyerToken}`,
        },
        body: JSON.stringify({ listingId: createdListingId }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(json.data.order.status, OrderStatus.PENDING);
      assert.strictEqual(Number(json.data.order.amount), 450.0);
      assert.strictEqual(json.data.order.buyerId, buyerUser.id);
      assert.strictEqual(json.data.order.sellerId, sellerUser.id);
      approvalOrderId = json.data.order.id;
    });

    it('1.5: Seller tries to complete PENDING order before Admin approval -> BLOCKED (409 Conflict)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${approvalOrderId}/complete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${sellerToken}` },
      });

      const json = await res.json();
      assert.strictEqual(res.status, 409);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Only APPROVED orders can be marked as COMPLETED/i);
    });

    it('1.6: Admin inspects pending order feed and approves the order -> APPROVED', async () => {
      const listRes = await fetch(`${baseUrl}/api/admin/orders?status=PENDING`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const listJson = await listRes.json();
      assert.strictEqual(listRes.status, 200);
      assert.ok(listJson.data.orders.some((o) => o.id === approvalOrderId));

      // Approve
      const approveRes = await fetch(`${baseUrl}/api/admin/orders/${approvalOrderId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const approveJson = await approveRes.json();
      assert.strictEqual(approveRes.status, 200);
      assert.strictEqual(approveJson.data.order.status, OrderStatus.APPROVED);
    });

    it('1.7: Seller sees the APPROVED order in incoming orders and marks it COMPLETED', async () => {
      const ordersRes = await fetch(`${baseUrl}/api/orders`, {
        headers: { Authorization: `Bearer ${sellerToken}` },
      });
      const ordersJson = await ordersRes.json();
      assert.strictEqual(ordersRes.status, 200);
      const incomingOrder = ordersJson.data.orders.find((o) => o.id === approvalOrderId);
      assert.ok(incomingOrder);
      assert.strictEqual(incomingOrder.status, OrderStatus.APPROVED);

      // Complete
      const completeRes = await fetch(`${baseUrl}/api/orders/${approvalOrderId}/complete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${sellerToken}` },
      });
      const completeJson = await completeRes.json();
      assert.strictEqual(completeRes.status, 200);
      assert.strictEqual(completeJson.data.order.status, OrderStatus.COMPLETED);
    });

    it('1.8: Buyer views order status -> Confirmed COMPLETED', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${approvalOrderId}`, {
        headers: { Authorization: `Bearer ${buyerToken}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.data.order.status, OrderStatus.COMPLETED);
    });
  });

  describe('2. Full End-to-End Rejection Lifecycle & Terminal Lock', () => {
    it('2.1: Buyer places second order for rejection flow', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyerToken}`,
        },
        body: JSON.stringify({ listingId: createdListingId }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(json.data.order.status, OrderStatus.PENDING);
      rejectionOrderId = json.data.order.id;
    });

    it('2.2: Admin rejects the order -> REJECTED', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders/${rejectionOrderId}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.data.order.status, OrderStatus.REJECTED);
    });

    it('2.3: Seller CANNOT complete REJECTED order -> BLOCKED (409 Conflict)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${rejectionOrderId}/complete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${sellerToken}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 409);
      assert.strictEqual(json.success, false);
    });

    it('2.4: Admin CANNOT approve already REJECTED order -> BLOCKED (409 Conflict)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders/${rejectionOrderId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 409);
      assert.strictEqual(json.success, false);
    });
  });

  describe('3. Security & Boundary Hardening Checks', () => {
    it('3.1: Unrelated Buyer CANNOT view private order belonging to another buyer (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${approvalOrderId}`, {
        headers: { Authorization: `Bearer ${maliciousUserToken}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /do not have permission to view or access this order/i);
    });

    it('3.2: Seller cannot purchase their own listing (403 Forbidden / Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sellerToken}`,
        },
        body: JSON.stringify({ listingId: createdListingId }),
      });
      assert.strictEqual(res.status, 403, 'Seller cannot call buyer order placement route');
    });

    it('3.3: Soft-deactivated listing cannot receive new orders (400 Bad Request)', async () => {
      // Deactivate listing
      await fetch(`${baseUrl}/api/listings/${createdListingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sellerToken}` },
      });

      // Attempt order
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyerToken}`,
        },
        body: JSON.stringify({ listingId: createdListingId }),
      });
      const json = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Cannot place an order on an inactive listing/i);
    });

    it('3.4: Attempting to complete an already COMPLETED order is blocked (409 Conflict)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${approvalOrderId}/complete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${sellerToken}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 409);
      assert.strictEqual(json.success, false);
    });
  });
});
