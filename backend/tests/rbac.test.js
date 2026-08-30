import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import { prisma } from '../src/config/prisma.js';
import { authenticate } from '../src/middleware/auth.middleware.js';
import { authorize } from '../src/middleware/rbac.middleware.js';
import { notFoundHandler, errorHandler } from '../src/middleware/error.middleware.js';
import { UserRole, ListingStatus, OrderStatus } from '../src/constants/roles.js';
import { assertListingOwnership, assertOrderAccess, assertSellerOrderOwnership } from '../src/utils/ownership.js';
import { registerUser } from '../src/services/auth.service.js';

describe('Phase 3 RBAC & Authorization Tests', () => {
  let server;
  let baseUrl;

  let buyer1, buyer1Token;
  let buyer2, buyer2Token;
  let seller1, seller1Token;
  let seller2, seller2Token;
  let admin, adminToken;

  let testListingSeller1;
  let testOrderBuyer1Seller1;

  before(async () => {
    // 1. Create a dedicated test express app to test RBAC & Ownership middleware
    const testApp = express();
    testApp.use(express.json());

    // Role-protected test endpoints
    testApp.get('/test/seller-only', authenticate, authorize(UserRole.SELLER), (req, res) => {
      res.json({ success: true, message: 'Seller resource accessed' });
    });

    testApp.get('/test/buyer-only', authenticate, authorize(UserRole.BUYER), (req, res) => {
      res.json({ success: true, message: 'Buyer resource accessed' });
    });

    testApp.get('/test/admin-only', authenticate, authorize(UserRole.ADMIN), (req, res) => {
      res.json({ success: true, message: 'Admin resource accessed' });
    });

    testApp.get('/test/multi-role', authenticate, authorize(UserRole.BUYER, UserRole.SELLER), (req, res) => {
      res.json({ success: true, message: 'Multi-role resource accessed' });
    });

    // Resource ownership test endpoints
    testApp.put('/test/listings/:id', authenticate, authorize(UserRole.SELLER), async (req, res, next) => {
      try {
        const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
        assertListingOwnership(listing, req.user.id);
        res.json({ success: true, message: 'Listing ownership verified' });
      } catch (err) {
        next(err);
      }
    });

    testApp.get('/test/orders/:id', authenticate, async (req, res, next) => {
      try {
        const order = await prisma.order.findUnique({ where: { id: req.params.id } });
        assertOrderAccess(order, req.user);
        res.json({ success: true, message: 'Order access verified' });
      } catch (err) {
        next(err);
      }
    });

    testApp.patch('/test/orders/:id/complete', authenticate, authorize(UserRole.SELLER), async (req, res, next) => {
      try {
        const order = await prisma.order.findUnique({ where: { id: req.params.id } });
        assertSellerOrderOwnership(order, req.user.id);
        res.json({ success: true, message: 'Seller order ownership verified' });
      } catch (err) {
        next(err);
      }
    });

    testApp.use(notFoundHandler);
    testApp.use(errorHandler);

    server = http.createServer(testApp);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    // 2. Setup Test Users
    const randomId = Math.random().toString(36).substring(7);

    const b1 = await registerUser({
      name: 'RBAC Buyer 1',
      email: `rbac_b1_${randomId}@test.com`,
      password: 'Password123!',
      role: UserRole.BUYER,
    });
    buyer1 = b1.user;
    buyer1Token = b1.token;

    const b2 = await registerUser({
      name: 'RBAC Buyer 2',
      email: `rbac_b2_${randomId}@test.com`,
      password: 'Password123!',
      role: UserRole.BUYER,
    });
    buyer2 = b2.user;
    buyer2Token = b2.token;

    const s1 = await registerUser({
      name: 'RBAC Seller 1',
      email: `rbac_s1_${randomId}@test.com`,
      password: 'Password123!',
      role: UserRole.SELLER,
    });
    seller1 = s1.user;
    seller1Token = s1.token;

    const s2 = await registerUser({
      name: 'RBAC Seller 2',
      email: `rbac_s2_${randomId}@test.com`,
      password: 'Password123!',
      role: UserRole.SELLER,
    });
    seller2 = s2.user;
    seller2Token = s2.token;

    // Login seeded Admin
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@test.com' } });
    const { loginUser } = await import('../src/services/auth.service.js');
    const adminLogin = await loginUser({ email: 'admin@test.com', password: 'Password123!' });
    admin = adminLogin.user;
    adminToken = adminLogin.token;

    // 3. Setup Test Listing owned by Seller 1
    testListingSeller1 = await prisma.listing.create({
      data: {
        sellerId: seller1.id,
        title: 'RBAC Test Listing',
        description: 'Test Description',
        price: 99.0,
        category: 'Test Category',
        status: ListingStatus.ACTIVE,
      },
    });

    // 4. Setup Test Order placed by Buyer 1 on Seller 1's listing
    testOrderBuyer1Seller1 = await prisma.order.create({
      data: {
        buyerId: buyer1.id,
        sellerId: seller1.id,
        listingId: testListingSeller1.id,
        amount: 99.0,
        status: OrderStatus.PENDING,
      },
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  describe('Role Authorization Checks (authorize middleware)', () => {
    it('BUYER cannot access SELLER-only endpoints (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/test/seller-only`, {
        headers: { Authorization: `Bearer ${buyer1Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Forbidden: Role 'BUYER' is not authorized/i);
    });

    it('BUYER cannot access ADMIN-only endpoints (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/test/admin-only`, {
        headers: { Authorization: `Bearer ${buyer1Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Forbidden: Role 'BUYER' is not authorized/i);
    });

    it('SELLER cannot access ADMIN-only endpoints (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/test/admin-only`, {
        headers: { Authorization: `Bearer ${seller1Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Forbidden: Role 'SELLER' is not authorized/i);
    });

    it('SELLER can access SELLER-only endpoints (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/test/seller-only`, {
        headers: { Authorization: `Bearer ${seller1Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
    });

    it('BUYER can access BUYER-only endpoints (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/test/buyer-only`, {
        headers: { Authorization: `Bearer ${buyer1Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
    });

    it('ADMIN can access ADMIN-only endpoints (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/test/admin-only`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
    });

    it('Both BUYER and SELLER can access multi-role endpoints (200 OK)', async () => {
      const resBuyer = await fetch(`${baseUrl}/test/multi-role`, {
        headers: { Authorization: `Bearer ${buyer1Token}` },
      });
      const resSeller = await fetch(`${baseUrl}/test/multi-role`, {
        headers: { Authorization: `Bearer ${seller1Token}` },
      });
      assert.strictEqual(resBuyer.status, 200);
      assert.strictEqual(resSeller.status, 200);
    });
  });

  describe('Resource Ownership Verification', () => {
    it('Seller 1 CAN modify Seller 1 listing (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/test/listings/${testListingSeller1.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${seller1Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
    });

    it('Seller 2 CANNOT modify Seller 1 listing (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/test/listings/${testListingSeller1.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${seller2Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /do not have permission to modify or deactivate this listing/i);
    });

    it('Buyer 1 CAN view their own order (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/test/orders/${testOrderBuyer1Seller1.id}`, {
        headers: { Authorization: `Bearer ${buyer1Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
    });

    it('Buyer 2 CANNOT view Buyer 1 order (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/test/orders/${testOrderBuyer1Seller1.id}`, {
        headers: { Authorization: `Bearer ${buyer2Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /do not have permission to view or access this order/i);
    });

    it('Seller 1 (listing owner) CAN view order placed for their listing (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/test/orders/${testOrderBuyer1Seller1.id}`, {
        headers: { Authorization: `Bearer ${seller1Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
    });

    it('Seller 2 (unrelated) CANNOT view order placed for Seller 1 listing (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/test/orders/${testOrderBuyer1Seller1.id}`, {
        headers: { Authorization: `Bearer ${seller2Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /do not have permission to view or access this order/i);
    });

    it('Admin CAN view any marketplace order regardless of buyer/seller (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/test/orders/${testOrderBuyer1Seller1.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
    });

    it('Seller 2 CANNOT complete order belonging to Seller 1 (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/test/orders/${testOrderBuyer1Seller1.id}/complete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${seller2Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /only perform actions on orders associated with your own listings/i);
    });
  });
});
