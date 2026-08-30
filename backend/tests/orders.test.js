import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { registerUser, loginUser } from '../src/services/auth.service.js';
import { UserRole, ListingStatus, OrderStatus } from '../src/constants/roles.js';

describe('Phase 5 Orders Tests', () => {
  let server;
  let baseUrl;

  let seller1, seller1Token;
  let seller2, seller2Token;
  let buyer1, buyer1Token;
  let buyer2, buyer2Token;
  let admin, adminToken;

  let activeListingSeller1;
  let inactiveListingSeller1;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    const randomSuffix = Math.random().toString(36).substring(7);

    // Create Seller 1
    const s1 = await registerUser({
      name: 'Order Seller 1',
      email: `orders_s1_${randomSuffix}@test.com`,
      password: 'Password123!',
      role: UserRole.SELLER,
    });
    seller1 = s1.user;
    seller1Token = s1.token;

    // Create Seller 2
    const s2 = await registerUser({
      name: 'Order Seller 2',
      email: `orders_s2_${randomSuffix}@test.com`,
      password: 'Password123!',
      role: UserRole.SELLER,
    });
    seller2 = s2.user;
    seller2Token = s2.token;

    // Create Buyer 1
    const b1 = await registerUser({
      name: 'Order Buyer 1',
      email: `orders_b1_${randomSuffix}@test.com`,
      password: 'Password123!',
      role: UserRole.BUYER,
    });
    buyer1 = b1.user;
    buyer1Token = b1.token;

    // Create Buyer 2
    const b2 = await registerUser({
      name: 'Order Buyer 2',
      email: `orders_b2_${randomSuffix}@test.com`,
      password: 'Password123!',
      role: UserRole.BUYER,
    });
    buyer2 = b2.user;
    buyer2Token = b2.token;

    // Admin
    const adminLogin = await loginUser({ email: 'admin@test.com', password: 'Password123!' });
    admin = adminLogin.user;
    adminToken = adminLogin.token;

    // Active listing
    activeListingSeller1 = await prisma.listing.create({
      data: {
        sellerId: seller1.id,
        title: 'High-Authority Tech Guest Post',
        description: 'Sponsored article placement on a high DA technology publication.',
        price: 175.5,
        category: 'Sponsored Posts',
        status: ListingStatus.ACTIVE,
      },
    });

    // Inactive listing
    inactiveListingSeller1 = await prisma.listing.create({
      data: {
        sellerId: seller1.id,
        title: 'Archived / Deactivated Listing',
        description: 'This listing is inactive and cannot accept orders.',
        price: 90.0,
        category: 'Archived',
        status: ListingStatus.INACTIVE,
      },
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  describe('POST /api/orders (Create Order)', () => {
    it('should allow a BUYER to place an order on an ACTIVE listing (201 Created)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyer1Token}`,
        },
        body: JSON.stringify({
          listingId: activeListingSeller1.id,
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.order.status, OrderStatus.PENDING);
      assert.strictEqual(Number(json.data.order.amount), 175.5);
      assert.strictEqual(json.data.order.buyerId, buyer1.id);
      assert.strictEqual(json.data.order.sellerId, seller1.id);
      assert.strictEqual(json.data.order.listingId, activeListingSeller1.id);
    });

    it('should prevent a SELLER from ordering their own listing (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${seller1Token}`,
        },
        body: JSON.stringify({
          listingId: activeListingSeller1.id,
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 403, 'Seller cannot call buyer-only order creation route');
    });

    it('should reject placing an order on an INACTIVE listing (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyer1Token}`,
        },
        body: JSON.stringify({
          listingId: inactiveListingSeller1.id,
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Cannot place an order on an inactive listing/i);
    });

    it('should return 404 when placing order for non-existent listing ID', async () => {
      const nonExistentListingId = '00000000-0000-0000-0000-000000000000';
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyer1Token}`,
        },
        body: JSON.stringify({
          listingId: nonExistentListingId,
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 404);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Listing not found/i);
    });

    it('should reject unauthenticated order placement (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: activeListingSeller1.id,
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(json.success, false);
    });
  });

  describe('GET /api/orders (Scoped Order Lists)', () => {
    it('BUYER sees their placed orders in GET /api/orders (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        headers: { Authorization: `Bearer ${buyer1Token}` },
      });
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data.orders));
      assert.ok(json.data.orders.length > 0);
      json.data.orders.forEach((order) => {
        assert.strictEqual(order.buyerId, buyer1.id);
      });
    });

    it('SELLER sees incoming orders for their listings in GET /api/orders (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        headers: { Authorization: `Bearer ${seller1Token}` },
      });
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data.orders));
      assert.ok(json.data.orders.length > 0);
      json.data.orders.forEach((order) => {
        assert.strictEqual(order.sellerId, seller1.id);
      });
    });

    it('Buyer 2 sees only their own empty/scoped order list (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        headers: { Authorization: `Bearer ${buyer2Token}` },
      });
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.orders.length, 0);
    });
  });

  describe('GET /api/orders/:id (Order Details & Ownership)', () => {
    let createdOrder;

    before(async () => {
      createdOrder = await prisma.order.create({
        data: {
          buyerId: buyer1.id,
          sellerId: seller1.id,
          listingId: activeListingSeller1.id,
          amount: 175.5,
          status: OrderStatus.PENDING,
        },
      });
    });

    it('Buyer 1 can view details of their own placed order (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${createdOrder.id}`, {
        headers: { Authorization: `Bearer ${buyer1Token}` },
      });
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.order.id, createdOrder.id);
      assert.strictEqual(json.data.order.buyer.id, buyer1.id);
      assert.strictEqual(json.data.order.seller.id, seller1.id);
    });

    it('Seller 1 (listing owner) can view details of the order (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${createdOrder.id}`, {
        headers: { Authorization: `Bearer ${seller1Token}` },
      });
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.order.id, createdOrder.id);
    });

    it('Buyer 2 CANNOT view Buyer 1 order details (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${createdOrder.id}`, {
        headers: { Authorization: `Bearer ${buyer2Token}` },
      });
      const json = await res.json();

      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /do not have permission to view or access this order/i);
    });

    it('Seller 2 (unrelated) CANNOT view Seller 1 order details (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${createdOrder.id}`, {
        headers: { Authorization: `Bearer ${seller2Token}` },
      });
      const json = await res.json();

      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /do not have permission to view or access this order/i);
    });

    it('Admin CAN view any order details (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${createdOrder.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.order.id, createdOrder.id);
    });

    it('should return 404 for non-existent order ID', async () => {
      const nonExistentOrderId = '00000000-0000-0000-0000-000000000000';
      const res = await fetch(`${baseUrl}/api/orders/${nonExistentOrderId}`, {
        headers: { Authorization: `Bearer ${buyer1Token}` },
      });
      const json = await res.json();

      assert.strictEqual(res.status, 404);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Order not found/i);
    });
  });
});
