import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { registerUser, loginUser } from '../src/services/auth.service.js';
import { UserRole, ListingStatus, OrderStatus } from '../src/constants/roles.js';

describe('Phase 6 Order Workflow & State Machine Tests', () => {
  let server;
  let baseUrl;

  let seller1, seller1Token;
  let seller2, seller2Token;
  let buyer1, buyer1Token;
  let admin, adminToken;

  let activeListingSeller1;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    const randomSuffix = Math.random().toString(36).substring(7);

    // Seller 1
    const s1 = await registerUser({
      name: 'Workflow Seller 1',
      email: `wf_s1_${randomSuffix}@test.com`,
      password: 'Password123!',
      role: UserRole.SELLER,
    });
    seller1 = s1.user;
    seller1Token = s1.token;

    // Seller 2
    const s2 = await registerUser({
      name: 'Workflow Seller 2',
      email: `wf_s2_${randomSuffix}@test.com`,
      password: 'Password123!',
      role: UserRole.SELLER,
    });
    seller2 = s2.user;
    seller2Token = s2.token;

    // Buyer 1
    const b1 = await registerUser({
      name: 'Workflow Buyer 1',
      email: `wf_b1_${randomSuffix}@test.com`,
      password: 'Password123!',
      role: UserRole.BUYER,
    });
    buyer1 = b1.user;
    buyer1Token = b1.token;

    // Admin login
    const adminLogin = await loginUser({ email: 'admin@test.com', password: 'Password123!' });
    admin = adminLogin.user;
    adminToken = adminLogin.token;

    // Listing
    activeListingSeller1 = await prisma.listing.create({
      data: {
        sellerId: seller1.id,
        title: 'Workflow Test Sponsored Article',
        description: 'Testing the state transitions and complete lifecycle.',
        price: 220.0,
        category: 'Sponsored Articles',
        status: ListingStatus.ACTIVE,
      },
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  describe('Complete Happy Path: PENDING -> APPROVED -> COMPLETED', () => {
    let orderId;

    it('Step 1: Buyer places order -> Initial status is PENDING (201 Created)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyer1Token}`,
        },
        body: JSON.stringify({ listingId: activeListingSeller1.id }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(json.data.order.status, OrderStatus.PENDING);
      orderId = json.data.order.id;
    });

    it('Step 2: Admin approves order -> Status transitions to APPROVED (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders/${orderId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.order.status, OrderStatus.APPROVED);
    });

    it('Step 3: Seller 1 completes order -> Status transitions to COMPLETED (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderId}/complete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${seller1Token}` },
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.order.status, OrderStatus.COMPLETED);
    });

    it('Step 4: Buyer verifies final status is COMPLETED (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${buyer1Token}` },
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.data.order.status, OrderStatus.COMPLETED);
    });
  });

  describe('Rejection Path: PENDING -> REJECTED & Terminal State Enforcement', () => {
    let rejectedOrderId;

    before(async () => {
      const order = await prisma.order.create({
        data: {
          buyerId: buyer1.id,
          sellerId: seller1.id,
          listingId: activeListingSeller1.id,
          amount: 220.0,
          status: OrderStatus.PENDING,
        },
      });
      rejectedOrderId = order.id;
    });

    it('Admin rejects PENDING order -> Status transitions to REJECTED (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders/${rejectedOrderId}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.order.status, OrderStatus.REJECTED);
    });

    it('Seller CANNOT complete a REJECTED order (409 Conflict)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${rejectedOrderId}/complete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${seller1Token}` },
      });

      const json = await res.json();
      assert.strictEqual(res.status, 409);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Only APPROVED orders can be marked as COMPLETED/i);
    });

    it('Admin CANNOT approve an already REJECTED order (409 Conflict)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders/${rejectedOrderId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const json = await res.json();
      assert.strictEqual(res.status, 409);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Only PENDING orders can be approved/i);
    });
  });

  describe('Invalid State Transitions Enforcement', () => {
    it('Seller CANNOT complete a PENDING order without admin approval (409 Conflict)', async () => {
      const pendingOrder = await prisma.order.create({
        data: {
          buyerId: buyer1.id,
          sellerId: seller1.id,
          listingId: activeListingSeller1.id,
          amount: 220.0,
          status: OrderStatus.PENDING,
        },
      });

      const res = await fetch(`${baseUrl}/api/orders/${pendingOrder.id}/complete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${seller1Token}` },
      });

      const json = await res.json();
      assert.strictEqual(res.status, 409);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Only APPROVED orders can be marked as COMPLETED/i);
    });

    it('Admin CANNOT approve an already APPROVED order (409 Conflict)', async () => {
      const approvedOrder = await prisma.order.create({
        data: {
          buyerId: buyer1.id,
          sellerId: seller1.id,
          listingId: activeListingSeller1.id,
          amount: 220.0,
          status: OrderStatus.APPROVED,
        },
      });

      const res = await fetch(`${baseUrl}/api/admin/orders/${approvedOrder.id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const json = await res.json();
      assert.strictEqual(res.status, 409);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Only PENDING orders can be approved/i);
    });

    it('Admin CANNOT reject an already COMPLETED order (409 Conflict)', async () => {
      const completedOrder = await prisma.order.create({
        data: {
          buyerId: buyer1.id,
          sellerId: seller1.id,
          listingId: activeListingSeller1.id,
          amount: 220.0,
          status: OrderStatus.COMPLETED,
        },
      });

      const res = await fetch(`${baseUrl}/api/admin/orders/${completedOrder.id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const json = await res.json();
      assert.strictEqual(res.status, 409);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Only PENDING orders can be rejected/i);
    });
  });

  describe('Workflow RBAC & Ownership Security', () => {
    let pendingOrder;
    let approvedOrder;

    before(async () => {
      pendingOrder = await prisma.order.create({
        data: {
          buyerId: buyer1.id,
          sellerId: seller1.id,
          listingId: activeListingSeller1.id,
          amount: 220.0,
          status: OrderStatus.PENDING,
        },
      });

      approvedOrder = await prisma.order.create({
        data: {
          buyerId: buyer1.id,
          sellerId: seller1.id,
          listingId: activeListingSeller1.id,
          amount: 220.0,
          status: OrderStatus.APPROVED,
        },
      });
    });

    it('BUYER cannot approve orders (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders/${pendingOrder.id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${buyer1Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
    });

    it('SELLER cannot approve orders (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders/${pendingOrder.id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${seller1Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
    });

    it('SELLER 2 cannot complete SELLER 1 approved order (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${approvedOrder.id}/complete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${seller2Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /only complete orders associated with your own listings/i);
    });

    it('ADMIN can retrieve all marketplace orders and filter by status (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders?status=PENDING`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data.orders));
      json.data.orders.forEach((o) => assert.strictEqual(o.status, OrderStatus.PENDING));
    });

    it('BUYER cannot access GET /api/admin/orders (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders`, {
        headers: { Authorization: `Bearer ${buyer1Token}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(json.success, false);
    });
  });
});
