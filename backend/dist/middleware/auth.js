"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
const database_js_1 = require("../config/database.js");
const redis_js_1 = require("../config/redis.js");
const errorHandler_js_1 = require("./errorHandler.js");
const authenticate = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new errorHandler_js_1.AppError('Authentication required', 401);
        }
        const token = authHeader.slice(7);
        // Check if token is blacklisted (logout)
        const isBlacklisted = await redis_js_1.cache.get(`blacklist:${token}`);
        if (isBlacklisted) {
            throw new errorHandler_js_1.AppError('Token has been revoked', 401);
        }
        const payload = jsonwebtoken_1.default.verify(token, index_js_1.config.JWT_SECRET);
        // Cache user lookup to reduce DB hits
        const cacheKey = `user:${payload.sub}:role`;
        let role = await redis_js_1.cache.get(cacheKey);
        if (!role) {
            const user = await database_js_1.prisma.user.findUnique({
                where: { id: payload.sub },
                select: { id: true, role: true, status: true },
            });
            if (!user)
                throw new errorHandler_js_1.AppError('User not found', 401);
            if (user.status === 'SUSPENDED')
                throw new errorHandler_js_1.AppError('Account suspended', 403);
            if (user.status === 'BANNED')
                throw new errorHandler_js_1.AppError('Account banned', 403);
            role = user.role;
            await redis_js_1.cache.set(cacheKey, role, 300); // 5 min cache
        }
        req.user = { id: payload.sub, email: payload.email, role };
        next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new errorHandler_js_1.AppError('Token expired', 401));
        }
        else if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errorHandler_js_1.AppError('Invalid token', 401));
        }
        else {
            next(err);
        }
    }
};
exports.authenticate = authenticate;
const requireRole = (...roles) => (req, _res, next) => {
    if (!req.user) {
        next(new errorHandler_js_1.AppError('Authentication required', 401));
        return;
    }
    if (!roles.includes(req.user.role)) {
        next(new errorHandler_js_1.AppError('Insufficient permissions', 403));
        return;
    }
    next();
};
exports.requireRole = requireRole;
const optionalAuth = async (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        next();
        return;
    }
    (0, exports.authenticate)(req, _res, next);
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map