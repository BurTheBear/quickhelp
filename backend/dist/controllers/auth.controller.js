"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_js_1 = require("../services/auth.service.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
exports.authController = {
    async signup(req, res, next) {
        try {
            const { email, password, displayName } = req.body;
            const result = await auth_service_js_1.authService.signup({ email, password, displayName });
            res.status(201).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await auth_service_js_1.authService.login(email, password);
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async firebaseAuth(req, res, next) {
        try {
            const { idToken, displayName } = req.body;
            const result = await auth_service_js_1.authService.firebaseAuth(idToken, displayName);
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const result = await auth_service_js_1.authService.refreshToken(refreshToken);
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async logout(req, res, next) {
        try {
            const token = req.headers.authorization.slice(7);
            await auth_service_js_1.authService.logout(token);
            res.json({ success: true, message: 'Logged out successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;
            await auth_service_js_1.authService.sendPasswordReset(email);
            // Always return success to prevent email enumeration
            res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
        }
        catch (err) {
            next(err);
        }
    },
    async resetPassword(req, res, next) {
        try {
            const { token, newPassword } = req.body;
            await auth_service_js_1.authService.resetPassword(token, newPassword);
            res.json({ success: true, message: 'Password reset successfully' });
        }
        catch (err) {
            next(err);
        }
    },
    async getMe(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const user = await auth_service_js_1.authService.getMe(req.user.id);
            res.json({ success: true, data: user });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=auth.controller.js.map