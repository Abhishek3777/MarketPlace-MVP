import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Phase 1 Foundation Tests', () => {
  it('should successfully connect to PostgreSQL database via Prisma', async () => {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    assert.strictEqual(result[0].connected, 1);
  });

  it('should respond to GET /api/health with operational status', async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    const res = await fetch(`http://localhost:${port}/api/health`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.message, 'Marketplace API is operational');

    await new Promise((resolve) => server.close(resolve));
  });

  it('should return 404 with standardized error for unknown route', async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    const res = await fetch(`http://localhost:${port}/api/non-existent-route`);
    const data = await res.json();

    assert.strictEqual(res.status, 404);
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error.code, 404);

    await new Promise((resolve) => server.close(resolve));
  });
});
