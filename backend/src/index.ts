import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';

import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { getRedis, closeRedis } from './config/redis.js';
import { initializeFirebase } from './config/firebase.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { requestId } from './middleware/requestId.js';
import { router } from './routes/index.js';
import { initializeSocket } from './socket/index.js';

const app = express();
const server = http.createServer(app);

// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────

app.use(requestId);
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── STATIC UPLOADS (local dev fallback when S3 is not configured) ───────────
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) },
    skip: (req) => req.url === '/health',
  })
);
app.use(rateLimiter);

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  const redis = getRedis();
  let redisOk = false;
  try {
    await redis.ping();
    redisOk = true;
  } catch {}

  res.json({
    status: 'ok',
    version: process.env.npm_package_version ?? '1.0.0',
    env: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    services: { redis: redisOk ? 'up' : 'down' },
  });
});

// ─── API ROUTES ──────────────────────────────────────────────────────────────

app.use(`/api/${config.API_VERSION}`, router);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

// ─── SOCKET.IO ───────────────────────────────────────────────────────────────

initializeSocket(server);

// ─── STARTUP ─────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  try {
    await connectDatabase();
    try {
      await getRedis().ping();
      logger.info('Redis connected ✅');
    } catch (redisErr) {
      logger.warn('Redis unavailable — caching disabled. App will still function.');
    }
    initializeFirebase();

    server.listen(config.PORT, '0.0.0.0', () => {
      logger.info(`🚀 QuickHelp API running on port ${config.PORT} [${config.NODE_ENV}]`);
      logger.info(`📡 WebSocket server initialized`);
      logger.info(`🔗 API: http://localhost:${config.PORT}/api/${config.API_VERSION}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// ─── GRACEFUL SHUTDOWN ───────────────────────────────────────────────────────

const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await disconnectDatabase();
    await closeRedis();
    logger.info('Server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

start();
