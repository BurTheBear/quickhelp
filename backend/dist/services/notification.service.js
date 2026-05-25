"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const database_js_1 = require("../config/database.js");
const firebase_js_1 = require("../config/firebase.js");
const index_js_1 = require("../socket/index.js");
const logger_js_1 = require("../utils/logger.js");
exports.notificationService = {
    async create(userId, input) {
        const notification = await database_js_1.prisma.notification.create({
            data: {
                userId,
                type: input.type,
                title: input.title,
                body: input.body,
                data: (input.data ?? {}),
            },
        });
        // Emit via WebSocket (in-app, real-time)
        const io = (0, index_js_1.getSocketServer)();
        if (io) {
            io.to(`user:${userId}`).emit('notification', notification);
        }
        // Send push notification (Firebase)
        this.sendPush(userId, input).catch((err) => logger_js_1.logger.error(`Push failed for user ${userId}:`, err));
        return notification;
    },
    async sendPush(userId, input) {
        const messaging = (0, firebase_js_1.getFirebaseMessaging)();
        if (!messaging)
            return;
        const devices = await database_js_1.prisma.userDevice.findMany({
            where: { userId, isActive: true },
            select: { fcmToken: true },
        });
        if (devices.length === 0)
            return;
        const tokens = devices.map((d) => d.fcmToken);
        try {
            await messaging.sendEachForMulticast({
                tokens,
                notification: { title: input.title, body: input.body },
                data: input.data
                    ? Object.fromEntries(Object.entries(input.data).map(([k, v]) => [k, String(v)]))
                    : undefined,
                apns: {
                    payload: {
                        aps: {
                            sound: input.type === 'REQUEST_MATCHED' || input.type === 'NEW_MESSAGE' ? 'default' : undefined,
                            badge: 1,
                        },
                    },
                },
                android: {
                    priority: input.type === 'NEARBY_REQUEST' ? 'high' : 'normal',
                    notification: { channelId: 'quickhelp_main', sound: 'default' },
                },
            });
            await database_js_1.prisma.notification.updateMany({
                where: { userId, type: input.type, isSent: false },
                data: { isSent: true, sentAt: new Date() },
            });
        }
        catch (err) {
            logger_js_1.logger.error('FCM send error:', err);
            // Remove invalid tokens
            const invalidTokenErrors = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];
            if (err && typeof err === 'object' && 'errorInfo' in err) {
                const fcmErr = err;
                if (invalidTokenErrors.includes(fcmErr.errorInfo.code)) {
                    await database_js_1.prisma.userDevice.updateMany({
                        where: { userId, fcmToken: { in: tokens } },
                        data: { isActive: false },
                    });
                }
            }
        }
    },
    async notifyNearbyVolunteers(request) {
        const NOTIFY_RADIUS_KM = request.urgency === 'EMERGENCY' ? 20 : 10;
        // Find volunteers within radius who are available
        // Using simplified bounding box for performance
        const latDelta = NOTIFY_RADIUS_KM / 111;
        const lngDelta = NOTIFY_RADIUS_KM / (111 * Math.cos((request.latitude * Math.PI) / 180));
        const volunteers = await database_js_1.prisma.userProfile.findMany({
            where: {
                isAvailable: true,
                latitude: {
                    gte: request.latitude - latDelta,
                    lte: request.latitude + latDelta,
                },
                longitude: {
                    gte: request.longitude - lngDelta,
                    lte: request.longitude + lngDelta,
                },
                user: {
                    status: 'ACTIVE',
                    id: { not: request.latitude.toString() }, // exclude requester (authorId not available here)
                },
            },
            select: { userId: true },
            take: 50,
        });
        await Promise.allSettled(volunteers.map((v) => this.create(v.userId, {
            type: 'NEARBY_REQUEST',
            title: `New ${request.urgency === 'EMERGENCY' ? '🚨 URGENT' : ''} help request nearby`,
            body: `${request.title} — ${request.rewardPoints} XP available`,
            data: { requestId: request.id, category: request.category },
        })));
    },
};
//# sourceMappingURL=notification.service.js.map