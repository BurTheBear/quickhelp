"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRateLimiter = exports.authRateLimiter = exports.rateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const index_js_1 = require("../config/index.js");
exports.rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: index_js_1.config.RATE_LIMIT_WINDOW_MS,
    max: index_js_1.config.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later' },
    skip: (req) => req.ip === '127.0.0.1' && index_js_1.config.isDev,
});
// Stricter limiter for auth endpoints
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: index_js_1.config.isDev ? 1000 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many authentication attempts' },
});
// Upload limiter
exports.uploadRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { success: false, error: 'Upload limit reached' },
});
//# sourceMappingURL=rateLimiter.js.map