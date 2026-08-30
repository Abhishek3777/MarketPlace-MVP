import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

const app = express();

// Security & Parsing Middlewares
app.use(
  cors({
    origin: config.clientUrl || '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Health & Info Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Marketplace API is operational',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

// Centralized Error Handlers (routes will be mounted here in subsequent phases)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
