import app from './app.js';
import { config } from './config/env.js';
import { prisma } from './config/prisma.js';

const startServer = async () => {
  try {
    // Verify database connectivity
    await prisma.$connect();
    console.log('[DB] PostgreSQL connected successfully via Prisma');

    const server = app.listen(config.port, () => {
      console.log(`[SERVER] Marketplace API running on http://localhost:${config.port} (env: ${config.nodeEnv})`);
    });

    const shutdown = async (signal) => {
      console.log(`\n[SERVER] Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('[DB] Prisma disconnected. Process exit.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('[ERROR] Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
