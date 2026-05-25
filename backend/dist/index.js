"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const index_js_1 = require("./config/index.js");
const database_js_1 = require("./config/database.js");
const redis_js_1 = require("./config/redis.js");
const firebase_js_1 = require("./config/firebase.js");
const logger_js_1 = require("./utils/logger.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const rateLimiter_js_1 = require("./middleware/rateLimiter.js");
const requestId_js_1 = require("./middleware/requestId.js");
const index_js_2 = require("./routes/index.js");
const index_js_3 = require("./socket/index.js");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────
app.use(requestId_js_1.requestId);
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: index_js_1.config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// ─── STATIC UPLOADS (local dev fallback when S3 is not configured) ───────────
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir))
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express_1.default.static(uploadsDir));
app.use((0, morgan_1.default)('combined', {
    stream: { write: (message) => logger_js_1.logger.http(message.trim()) },
    skip: (req) => req.url === '/health',
}));
app.use(rateLimiter_js_1.rateLimiter);
// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
    const redis = (0, redis_js_1.getRedis)();
    let redisOk = false;
    try {
        await redis.ping();
        redisOk = true;
    }
    catch { }
    res.json({
        status: 'ok',
        version: process.env.npm_package_version ?? '1.0.0',
        env: index_js_1.config.NODE_ENV,
        timestamp: new Date().toISOString(),
        services: { redis: redisOk ? 'up' : 'down' },
    });
});
// ─── API ROUTES ──────────────────────────────────────────────────────────────
app.use(`/api/${index_js_1.config.API_VERSION}`, index_js_2.router);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});
// Global error handler (must be last)
app.use(errorHandler_js_1.errorHandler);
// ─── SOCKET.IO ───────────────────────────────────────────────────────────────
(0, index_js_3.initializeSocket)(server);
// ─── STARTUP ─────────────────────────────────────────────────────────────────
async function start() {
    try {
        await (0, database_js_1.connectDatabase)();
        try {
            await (0, redis_js_1.getRedis)().ping();
            logger_js_1.logger.info('Redis connected ✅');
        }
        catch (redisErr) {
            logger_js_1.logger.warn('Redis unavailable — caching disabled. App will still function.');
        }
        (0, firebase_js_1.initializeFirebase)();
        server.listen(index_js_1.config.PORT, '0.0.0.0', () => {
            logger_js_1.logger.info(`🚀 QuickHelp API running on port ${index_js_1.config.PORT} [${index_js_1.config.NODE_ENV}]`);
            logger_js_1.logger.info(`📡 WebSocket server initialized`);
            logger_js_1.logger.info(`🔗 API: http://localhost:${index_js_1.config.PORT}/api/${index_js_1.config.API_VERSION}`);
        });
    }
    catch (err) {
        logger_js_1.logger.error('Failed to start server:', err);
        process.exit(1);
    }
}
// ─── GRACEFUL SHUTDOWN ───────────────────────────────────────────────────────
const shutdown = async (signal) => {
    logger_js_1.logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
        await (0, database_js_1.disconnectDatabase)();
        await (0, redis_js_1.closeRedis)();
        logger_js_1.logger.info('Server closed');
        process.exit(0);
    });
    // Force exit after 10 seconds
    setTimeout(() => {
        logger_js_1.logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10_000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
    logger_js_1.logger.error('Unhandled rejection:', reason);
});
process.on('uncaughtException', (error) => {
    logger_js_1.logger.error('Uncaught exception:', error);
    process.exit(1);
});
start();
//# sourceMappingURL=index.js.map