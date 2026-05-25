"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
exports.getRedis = getRedis;
exports.closeRedis = closeRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const index_js_1 = require("./index.js");
const logger_js_1 = require("../utils/logger.js");
let redisClient = null;
function getRedis() {
    if (redisClient)
        return redisClient;
    redisClient = new ioredis_1.default(index_js_1.config.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 50, 2000),
        lazyConnect: true,
    });
    redisClient.on('connect', () => logger_js_1.logger.info('Redis connected'));
    redisClient.on('error', (err) => logger_js_1.logger.error('Redis error:', err));
    redisClient.on('close', () => logger_js_1.logger.warn('Redis connection closed'));
    return redisClient;
}
async function closeRedis() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}
// Cache helpers
exports.cache = {
    async get(key) {
        const redis = getRedis();
        const val = await redis.get(key);
        return val ? JSON.parse(val) : null;
    },
    async set(key, value, ttlSeconds = 300) {
        const redis = getRedis();
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
    },
    async del(key) {
        const redis = getRedis();
        await redis.del(key);
    },
    async invalidatePattern(pattern) {
        const redis = getRedis();
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    },
};
//# sourceMappingURL=redis.js.map