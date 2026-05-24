import { Server as HTTPServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/database.js';
import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

let io: SocketServer | null = null;

interface SocketUser {
  id: string;
  email: string;
}

declare module 'socket.io' {
  interface Socket {
    user?: SocketUser;
  }
}

export function getSocketServer(): SocketServer | null {
  return io;
}

export function initializeSocket(server: HTTPServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // JWT Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token as string | undefined;
      if (!token) {
        next(new Error('Authentication required'));
        return;
      }

      const payload = jwt.verify(token, config.JWT_SECRET) as SocketUser & { sub: string };
      socket.user = { id: payload.sub, email: payload.email };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    if (!socket.user) return;

    const userId = socket.user.id;
    logger.debug(`Socket connected: ${userId}`);

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // Track online status
    const redis = getRedis();
    await redis.sadd('online_users', userId);
    socket.broadcast.emit('user_online', { userId });

    // Join active request rooms
    const activeMatches = await prisma.match.findMany({
      where: { volunteerId: userId, status: { in: ['ACCEPTED', 'IN_PROGRESS'] } },
      select: { requestId: true },
    });
    const authoredRequests = await prisma.helpRequest.findMany({
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
    socket.on('join_request', async (requestId: string) => {
      if (!socket.user) return;

      // Verify user has access to this request
      const hasAccess = await prisma.helpRequest.findFirst({
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

    socket.on('leave_request', (requestId: string) => {
      socket.leave(`request:${requestId}`);
    });

    // Real-time message sending
    socket.on('send_message', async (data: { conversationId: string; content: string; type?: string }) => {
      if (!socket.user) return;

      try {
        const conversation = await prisma.conversation.findUnique({
          where: { id: data.conversationId },
          include: { request: { select: { authorId: true, id: true } } },
        });

        if (!conversation) return;

        // Verify access
        const hasAccess = await prisma.match.findFirst({
          where: {
            requestId: conversation.requestId,
            OR: [
              { volunteerId: socket.user.id },
              { request: { authorId: socket.user.id } },
            ],
          },
        });

        const isAuthor = conversation.request.authorId === socket.user.id;
        if (!hasAccess && !isAuthor) return;

        const message = await prisma.message.create({
          data: {
            conversationId: data.conversationId,
            senderId: socket.user.id,
            content: data.content,
            type: (data.type as 'TEXT' | 'IMAGE' | 'LOCATION') ?? 'TEXT',
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
      } catch (err) {
        logger.error('Socket message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicators
    socket.on('typing_start', (data: { requestId: string }) => {
      socket.to(`request:${data.requestId}`).emit('typing', {
        userId,
        requestId: data.requestId,
      });
    });

    socket.on('typing_stop', (data: { requestId: string }) => {
      socket.to(`request:${data.requestId}`).emit('stop_typing', {
        userId,
        requestId: data.requestId,
      });
    });

    // Location sharing (volunteer en route)
    socket.on('location_update', (data: { requestId: string; lat: number; lng: number }) => {
      socket.to(`request:${data.requestId}`).emit('volunteer_location', {
        userId,
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      logger.debug(`Socket disconnected: ${userId}`);
      await redis.srem('online_users', userId);
      socket.broadcast.emit('user_offline', { userId });
    });
  });

  logger.info('Socket.io initialized');
  return io;
}
