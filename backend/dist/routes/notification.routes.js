"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRouter = void 0;
const express_1 = require("express");
const notification_controller_js_1 = require("../controllers/notification.controller.js");
const auth_js_1 = require("../middleware/auth.js");
exports.notificationRouter = (0, express_1.Router)();
exports.notificationRouter.get('/', auth_js_1.authenticate, notification_controller_js_1.notificationController.getNotifications);
exports.notificationRouter.get('/unread-count', auth_js_1.authenticate, notification_controller_js_1.notificationController.getUnreadCount);
exports.notificationRouter.patch('/:id/read', auth_js_1.authenticate, notification_controller_js_1.notificationController.markRead);
exports.notificationRouter.patch('/read-all', auth_js_1.authenticate, notification_controller_js_1.notificationController.markAllRead);
exports.notificationRouter.delete('/:id', auth_js_1.authenticate, notification_controller_js_1.notificationController.remove);
//# sourceMappingURL=notification.routes.js.map