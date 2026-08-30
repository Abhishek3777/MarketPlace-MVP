import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.warn(`[WARN] Missing environment variable: ${key}. Using defaults if available.`);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/marketplace_db?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_dev_key_marketplace_2025_secure_xyz',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
