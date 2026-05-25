"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationController = void 0;
const database_js_1 = require("../config/database.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
exports.notificationController = {
    async getNotifications(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const page = Number(req.query.page ?? 1);
            const limit = Number(req.query.limit ?? 20);
            const [notifications, total, unread] = await Promise.all([
                database_js_1.prisma.notification.findMany({
                    where: { userId: req.user.id },
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                database_js_1.prisma.notification.count({ where: { userId: req.user.id } }),
                database_js_1.prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
            ]);
            res.json({
                success: true,
                data: { notifications, total, unread, page, hasMore: page * limit < total },
            });
        }
        catch (err) {
            next(err);
        }
    },
    async getUnreadCount(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const count = await database_js_1.prisma.notification.count({
                where: { userId: req.user.id, isRead: false },
            });
            res.json({ success: true, data: { count } });
        }
        catch (err) {
            next(err);
        }
    },
    async markRead(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            await database_js_1.prisma.notification.updateMany({
                where: { id: req.params.id, userId: req.user.id },
                data: { isRead: true, readAt: new Date() },
            });
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    },
    async markAllRead(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            await database_js_1.prisma.notification.updateMany({
                where: { userId: req.user.id, isRead: false },
                data: { isRead: true, readAt: new Date() },
            });
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    },
    async remove(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            await database_js_1.prisma.notification.deleteMany({
                where: { id: req.params.id, userId: req.user.id },
            });
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=notification.controller.js.map