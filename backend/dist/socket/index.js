"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocketServer = getSocketServer;
exports.initializeSocket = initializeSocket;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
const database_js_1 = require("../config/database.js");
const redis_js_1 = require("../config/redis.js");
const logger_js_1 = require("../utils/logger.js");
let io = null;
function getSocketServer() {
    return io;
}
function initializeSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: index_js_1.config.corsOrigins,
            credentials: true,
            methods: ['GET', 'POST'],
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 30000,
        pingInterval: 10000,
    });
    // JWT Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                next(new Error('Authentication required'));
                return;
            }
            const payload = jsonwebtoken_1.default.verify(token, index_js_1.config.JWT_SECRET);
            socket.user = { id: payload.sub, email: payload.email };
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', async (socket) => {
        if (!socket.user)
            return;
        const userId = socket.user.id;
        logger_js_1.logger.debug(`Socket connected: ${userId}`);
        // Join personal room for notifications
        socket.join(`user:${userId}`);
        // Track online status
        const redis = (0, redis_js_1.getRedis)();
        await redis.sadd('online_users', userId);
        socket.broadcast.emit('user_online', { userId });
        // Join active request rooms
        const activeMatches = await database_js_1.prisma.match.findMany({
            where: { volunteerId: userId, status: { in: ['ACCEPTED', 'IN_PROGRESS'] } },
            select: { requestId: true },
        });
        const authoredRequests = await database_js_1.prisma.helpRequest.findMany({
            where: { authorId: userId, status: { in: ['OPEN', 'MATCHED', 'IN_PROGRESS'] } },
            select: { id: true },
        });
        const requestRooms = [
            ...activeMatches.map((m) => `request:${m.requestId}`),
            ...authoredRequests.map((r) => `request:${r.id}`),
        ];
        requestRooms.forEach((room) => socket.join(room));
        // ─── EVENT HANDLERS ─────────────────────────────────────────────────────
        // Join a specific request room (e.g., when opening a chat)
        socket.on('join_request', async (requestId) => {
            if (!socket.user)
                return;
            // Verify user has access to this request
            const hasAccess = await database_js_1.prisma.helpRequest.findFirst({
                where: {
                    id: requestId,
                    OR: [
                        { authorId: socket.user.id },
                        { matches: { some: { volunteerId: socket.user.id } } },
                    ],
                },
            });
            if (hasAccess) {
                socket.join(`request:${requestId}`);
                socket.emit('joined_request', { requestId });
            }
        });
        socket.on('leave_request', (requestId) => {
            socket.leave(`request:${requestId}`);
        });
        // Real-time message sending
        socket.on('send_message', async (data) => {
            if (!socket.user)
                return;
            try {
                const conversation = await database_js_1.prisma.conversation.findUnique({
                    where: { id: data.conversationId },
                    include: { request: { select: { authorId: true, id: true } } },
                });
                if (!conversation)
                    return;
                // Verify access
                const hasAccess = await database_js_1.prisma.match.findFirst({
                    where: {
                        requestId: conversation.requestId,
                        OR: [
                            { volunteerId: socket.user.id },
                            { request: { authorId: socket.user.id } },
                        ],
                    },
                });
                const isAuthor = conversation.request.authorId === socket.user.id;
                if (!hasAccess && !isAuthor)
                    return;
                const message = await database_js_1.prisma.message.create({
                    data: {
                        conversationId: data.conversationId,
                        senderId: socket.user.id,
                        content: data.content,
                        type: data.type ?? 'TEXT',
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
                // Broadcast to request room
                io?.to(`request:${conversation.request.id}`).emit('new_message', message);
            }
            catch (err) {
                logger_js_1.logger.error('Socket message error:', err);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });
        // Typing indicators
        socket.on('typing_start', (data) => {
            socket.to(`request:${data.requestId}`).emit('typing', {
                userId,
                requestId: data.requestId,
            });
        });
        socket.on('typing_stop', (data) => {
            socket.to(`request:${data.requestId}`).emit('stop_typing', {
                userId,
                requestId: data.requestId,
            });
        });
        // Location sharing (volunteer en route)
        socket.on('location_update', (data) => {
            socket.to(`request:${data.requestId}`).emit('volunteer_location', {
                userId,
                ...data,
                timestamp: new Date().toISOString(),
            });
        });
        // Disconnect
        socket.on('disconnect', async () => {
            logger_js_1.logger.debug(`Socket disconnected: ${userId}`);
            await redis.srem('online_users', userId);
            socket.broadcast.emit('user_offline', { userId });
        });
    });
    logger_js_1.logger.info('Socket.io initialized');
    return io;
}
//# sourceMappingURL=index.js.map