"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatController = void 0;
const database_js_1 = require("../config/database.js");
const index_js_1 = require("../socket/index.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
async function verifyConversationAccess(userId, requestId) {
    const request = await database_js_1.prisma.helpRequest.findFirst({
        where: {
            id: requestId,
            OR: [
                { authorId: userId },
                { matches: { some: { volunteerId: userId, status: { in: ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'] } } } },
            ],
        },
    });
    return !!request;
}
exports.chatController = {
    async getConversation(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const { requestId } = req.params;
            const hasAccess = await verifyConversationAccess(req.user.id, requestId);
            if (!hasAccess)
                throw new errorHandler_js_1.AppError('Access denied', 403);
            const conversation = await database_js_1.prisma.conversation.findUnique({
                where: { requestId },
                include: {
                    messages: {
                        include: {
                            sender: {
                                select: {
                                    id: true,
                                    profile: { select: { displayName: true, avatarUrl: true } },
                                },
                            },
                        },
                        orderBy: { createdAt: 'asc' },
                        take: 50,
                    },
                },
            });
            if (!conversation)
                throw new errorHandler_js_1.AppError('Conversation not found', 404);
            res.json({ success: true, data: conversation });
        }
        catch (err) {
            next(err);
        }
    },
    async getMessages(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const { requestId } = req.params;
            const cursor = req.query.cursor;
            const limit = Number(req.query.limit ?? 30);
            const hasAccess = await verifyConversationAccess(req.user.id, requestId);
            if (!hasAccess)
                throw new errorHandler_js_1.AppError('Access denied', 403);
            const conversation = await database_js_1.prisma.conversation.findUnique({ where: { requestId } });
            if (!conversation)
                throw new errorHandler_js_1.AppError('Conversation not found', 404);
            const messages = await database_js_1.prisma.message.findMany({
                where: {
                    conversationId: conversation.id,
                    deletedAt: null,
                    ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            profile: { select: { displayName: true, avatarUrl: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
            });
            res.json({
                success: true,
                data: messages.reverse(),
                nextCursor: messages.length === limit ? messages[0]?.createdAt.toISOString() : null,
            });
        }
        catch (err) {
            next(err);
        }
    },
    async sendMessage(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const { requestId } = req.params;
            const hasAccess = await verifyConversationAccess(req.user.id, requestId);
            if (!hasAccess)
                throw new errorHandler_js_1.AppError('Access denied', 403);
            const conversation = await database_js_1.prisma.conversation.findUnique({ where: { requestId } });
            if (!conversation)
                throw new errorHandler_js_1.AppError('Conversation not found', 404);
            const message = await database_js_1.prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    senderId: req.user.id,
                    content: req.body.content,
                    type: req.body.type ?? 'TEXT',
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            profile: { select: { displayName: true, avatarUrl: true } },
                        },
                    },
                },
            });
            // Broadcast via WebSocket
            const io = (0, index_js_1.getSocketServer)();
            io?.to(`request:${requestId}`).emit('new_message', message);
            res.status(201).json({ success: true, data: message });
        }
        catch (err) {
            next(err);
        }
    },
    async markRead(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            await database_js_1.prisma.message.update({
                where: { id: req.params.messageId },
                data: { isRead: true, readAt: new Date() },
            });
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    },
    async getUnreadCount(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const count = await database_js_1.prisma.message.count({
                where: {
                    isRead: false,
                    deletedAt: null,
                    senderId: { not: req.user.id },
                    conversation: {
                        request: {
                            OR: [
                                { authorId: req.user.id },
                                { matches: { some: { volunteerId: req.user.id } } },
                            ],
                        },
                    },
                },
            });
            res.json({ success: true, data: { count } });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=chat.controller.js.map