import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Phase 2 Authentication Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const uniqueEmail = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;

  describe('POST /api/auth/register', () => {
    it('should successfully register a BUYER and return 201 with token', async () => {
      const email = uniqueEmail('buyer');
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Buyer',
          email,
          password: 'Password123!',
          role: 'BUYER',
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.email, email);
      assert.strictEqual(json.data.user.role, 'BUYER');
      assert.strictEqual(typeof json.data.token, 'string');
      assert.strictEqual(json.data.user.passwordHash, undefined, 'passwordHash must not be exposed');
    });

    it('should successfully register a SELLER and return 201 with token', async () => {
      const email = uniqueEmail('seller');
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Seller',
          email,
          password: 'Password123!',
          role: 'SELLER',
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.email, email);
      assert.strictEqual(json.data.user.role, 'SELLER');
      assert.strictEqual(typeof json.data.token, 'string');
    });

    it('should reject public registration with ADMIN role (400 Bad Request)', async () => {
      const email = uniqueEmail('fakeadmin');
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Malicious Admin Attempter',
          email,
          password: 'Password123!',
          role: 'ADMIN',
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /ADMIN cannot be registered publicly/i);
    });

    it('should reject registration with duplicate email (409 Conflict)', async () => {
      const email = uniqueEmail('duplicate');
      // First registration
      await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Original User',
          email,
          password: 'Password123!',
          role: 'BUYER',
        }),
      });

      // Second registration with same email
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate User',
          email,
          password: 'Password123!',
          role: 'SELLER',
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 409);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /already exists/i);
    });

    it('should reject invalid input data (invalid email, short password) with 400', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          email: 'not-an-email',
          password: '123',
          role: 'INVALID_ROLE',
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(json.success, false);
      assert.ok(Array.isArray(json.error.details));
    });
  });

  describe('POST /api/auth/login', () => {
    const userEmail = uniqueEmail('login_test');
    const userPassword = 'CorrectPassword123!';

    before(async () => {
      await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Login Test User',
          email: userEmail,
          password: userPassword,
          role: 'BUYER',
        }),
      });
    });

    it('should successfully login with correct credentials (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          password: userPassword,
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.email, userEmail);
      assert.strictEqual(json.data.user.role, 'BUYER');
      assert.strictEqual(typeof json.data.token, 'string');
      assert.strictEqual(json.data.user.passwordHash, undefined);
    });

    it('should login seeded Admin account (admin@test.com)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'Password123!',
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.email, 'admin@test.com');
      assert.strictEqual(json.data.user.role, 'ADMIN');
    });

    it('should reject login with wrong password (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          password: 'WrongPassword!',
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Invalid email or password/i);
    });

    it('should reject login with non-existent email (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent_user_9999@test.com',
          password: 'Password123!',
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(json.success, false);
      assert.match(json.error.message, /Invalid email or password/i);
    });
  });

  describe('GET /api/auth/me & Protected Route Verification', () => {
    let buyerToken;
    let buyerEmail;

    before(async () => {
      buyerEmail = uniqueEmail('me_test');
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Me Profile User',
          email: buyerEmail,
          password: 'Password123!',
          role: 'BUYER',
        }),
      });
      const regData = await regRes.json();
      buyerToken = regData.data.token;
    });

    it('should return authoritative user profile when valid token provided (200)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${buyerToken}` },
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.email, buyerEmail);
      assert.strictEqual(json.data.user.role, 'BUYER');
    });

    it('should reject request when Authorization header is missing (401)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, { method: 'GET' });
      const json = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(json.success, false);
    });

    it('should reject request when token is invalid/tampered (401)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        method: 'GET',
        headers: { Authorization: 'Bearer invalid.tampered.token' },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(json.success, false);
    });

    it('should successfully acknowledge logout for authenticated user (200)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${buyerToken}` },
      });
      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
    });
  });
});
