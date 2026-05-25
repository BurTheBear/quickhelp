"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_controller_js_1 = require("../controllers/auth.controller.js");
const auth_js_1 = require("../middleware/auth.js");
const validate_js_1 = require("../middleware/validate.js");
const rateLimiter_js_1 = require("../middleware/rateLimiter.js");
exports.authRouter = (0, express_1.Router)();
const signupSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128),
    displayName: zod_1.z.string().min(2).max(50),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const firebaseSchema = zod_1.z.object({
    idToken: zod_1.z.string().min(1),
    displayName: zod_1.z.string().min(2).max(50).optional(),
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1),
});
exports.authRouter.post('/signup', rateLimiter_js_1.authRateLimiter, (0, validate_js_1.validate)(signupSchema), auth_controller_js_1.authController.signup);
exports.authRouter.post('/login', rateLimiter_js_1.authRateLimiter, (0, validate_js_1.validate)(loginSchema), auth_controller_js_1.authController.login);
exports.authRouter.post('/firebase', rateLimiter_js_1.authRateLimiter, (0, validate_js_1.validate)(firebaseSchema), auth_controller_js_1.authController.firebaseAuth);
exports.authRouter.post('/refresh', (0, validate_js_1.validate)(refreshSchema), auth_controller_js_1.authController.refreshToken);
exports.authRouter.post('/logout', auth_js_1.authenticate, auth_controller_js_1.authController.logout);
exports.authRouter.post('/forgot-password', rateLimiter_js_1.authRateLimiter, auth_controller_js_1.authController.forgotPassword);
exports.authRouter.post('/reset-password', rateLimiter_js_1.authRateLimiter, auth_controller_js_1.authController.resetPassword);
exports.authRouter.get('/me', auth_js_1.authenticate, auth_controller_js_1.authController.getMe);
//# sourceMappingURL=auth.routes.js.map