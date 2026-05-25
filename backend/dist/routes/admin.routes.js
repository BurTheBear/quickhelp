"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const admin_controller_js_1 = require("../controllers/admin.controller.js");
const auth_js_1 = require("../middleware/auth.js");
exports.adminRouter = (0, express_1.Router)();
// All admin routes require ADMIN or SUPER_ADMIN role
exports.adminRouter.use(auth_js_1.authenticate, (0, auth_js_1.requireRole)('ADMIN', 'SUPER_ADMIN'));
// Dashboard metrics
exports.adminRouter.get('/dashboard', admin_controller_js_1.adminController.getDashboard);
exports.adminRouter.get('/analytics', admin_controller_js_1.adminController.getAnalytics);
// User management
exports.adminRouter.get('/users', admin_controller_js_1.adminController.listUsers);
exports.adminRouter.get('/users/:id', admin_controller_js_1.adminController.getUserDetail);
exports.adminRouter.patch('/users/:id/status', admin_controller_js_1.adminController.updateUserStatus);
exports.adminRouter.patch('/users/:id/role', (0, auth_js_1.requireRole)('SUPER_ADMIN'), admin_controller_js_1.adminController.updateUserRole);
exports.adminRouter.delete('/users/:id', (0, auth_js_1.requireRole)('SUPER_ADMIN'), admin_controller_js_1.adminController.deleteUser);
// Request moderation
exports.adminRouter.get('/requests', admin_controller_js_1.adminController.listRequests);
exports.adminRouter.patch('/requests/:id/flag', admin_controller_js_1.adminController.flagRequest);
exports.adminRouter.patch('/requests/:id/unflag', admin_controller_js_1.adminController.unflagRequest);
exports.adminRouter.delete('/requests/:id', admin_controller_js_1.adminController.deleteRequest);
// Reports management
exports.adminRouter.get('/reports', admin_controller_js_1.adminController.listReports);
exports.adminRouter.get('/reports/:id', admin_controller_js_1.adminController.getReport);
exports.adminRouter.patch('/reports/:id/resolve', admin_controller_js_1.adminController.resolveReport);
exports.adminRouter.patch('/reports/:id/dismiss', admin_controller_js_1.adminController.dismissReport);
// Content moderation
exports.adminRouter.get('/flagged', admin_controller_js_1.adminController.getFlaggedContent);
// Badges & Achievements management
exports.adminRouter.get('/badges', admin_controller_js_1.adminController.listBadges);
exports.adminRouter.post('/badges', admin_controller_js_1.adminController.createBadge);
exports.adminRouter.patch('/badges/:id', admin_controller_js_1.adminController.updateBadge);
// Challenges
exports.adminRouter.get('/challenges', admin_controller_js_1.adminController.listChallenges);
exports.adminRouter.post('/challenges', admin_controller_js_1.adminController.createChallenge);
exports.adminRouter.patch('/challenges/:id', admin_controller_js_1.adminController.updateChallenge);
//# sourceMappingURL=admin.routes.js.map