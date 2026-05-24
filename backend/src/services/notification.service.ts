import { NotificationType } from '@prisma/client';
import { prisma } from '../config/database.js';
import { getFirebaseMessaging } from '../config/firebase.js';
import { getSocketServer } from '../socket/index.js';
import { logger } from '../utils/logger.js';

interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export const notificationService = {
  async create(userId: string, input: CreateNotificationInput) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ?? {},
      },
    });

    // Emit via WebSocket (in-app, real-time)
    const io = getSocketServer();
    if (io) {
      io.to(`user:${userId}`).emit('notification', notification);
    }

    // Send push notification (Firebase)
    this.sendPush(userId, input).catch((err) =>
      logger.error(`Push failed for user ${userId}:`, err)
    );

    return notification;
  },

  async sendPush(userId: string, input: CreateNotificationInput): Promise<void> {
    const messaging = getFirebaseMessaging();
    if (!messaging) return;

    const devices = await prisma.userDevice.findMany({
      where: { userId, isActive: true },
      select: { fcmToken: true },
    });

    if (devices.length === 0) return;

    const tokens = devices.map((d) => d.fcmToken);

    try {
      await messaging.sendEachForMulticast({
        tokens,
        notification: { title: input.title, body: input.body },
        data: input.data
          ? Object.fromEntries(
              Object.entries(input.data).map(([k, v]) => [k, String(v)])
            )
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

      await prisma.notification.updateMany({
        where: { userId, type: input.type, isSent: false },
        data: { isSent: true, sentAt: new Date() },
      });
    } catch (err) {
      logger.error('FCM send error:', err);
      // Remove invalid tokens
      const invalidTokenErrors = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];
      if (err && typeof err === 'object' && 'errorInfo' in err) {
        const fcmErr = err as { errorInfo: { code: string } };
        if (invalidTokenErrors.includes(fcmErr.errorInfo.code)) {
          await prisma.userDevice.updateMany({
            where: { userId, fcmToken: { in: tokens } },
            data: { isActive: false },
          });
        }
      }
    }
  },

  async notifyNearbyVolunteers(request: {
    id: string;
    title: string;
    category: string;
    urgency: string;
    latitude: number;
    longitude: number;
    rewardPoints: number;
  }): Promise<void> {
    const NOTIFY_RADIUS_KM = request.urgency === 'EMERGENCY' ? 20 : 10;

    // Find volunteers within radius who are available
    // Using simplified bounding box for performance
    const latDelta = NOTIFY_RADIUS_KM / 111;
    const lngDelta = NOTIFY_RADIUS_KM / (111 * Math.cos((request.latitude * Math.PI) / 180));

    const volunteers = await prisma.userProfile.findMany({
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

    await Promise.allSettled(
      volunteers.map((v) =>
        this.create(v.userId, {
          type: 'NEARBY_REQUEST',
          title: `New ${request.urgency === 'EMERGENCY' ? '🚨 URGENT' : ''} help request nearby`,
          body: `${request.title} — ${request.rewardPoints} XP available`,
          data: { requestId: request.id, category: request.category },
        })
      )
    );
  },
};
