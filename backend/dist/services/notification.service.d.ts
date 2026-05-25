import { NotificationType } from '@prisma/client';
interface CreateNotificationInput {
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
}
export declare const notificationService: {
    create(userId: string, input: CreateNotificationInput): Promise<{
        type: import(".prisma/client").$Enums.NotificationType;
        id: string;
        createdAt: Date;
        title: string;
        data: import("@prisma/client/runtime/library.js").JsonValue | null;
        isRead: boolean;
        readAt: Date | null;
        userId: string;
        body: string;
        isSent: boolean;
        sentAt: Date | null;
    }>;
    sendPush(userId: string, input: CreateNotificationInput): Promise<void>;
    notifyNearbyVolunteers(request: {
        id: string;
        title: string;
        category: string;
        urgency: string;
        latitude: number;
        longitude: number;
        rewardPoints: number;
    }): Promise<void>;
};
export {};
//# sourceMappingURL=notification.service.d.ts.map