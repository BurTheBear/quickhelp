import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { getSocketServer } from '../socket/index.js';
import { AppError } from '../middleware/errorHandler.js';

async function verifyConversationAccess(userId: string, requestId: string): Promise<boolean> {
  const request = await prisma.helpRequest.findFirst({
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

export const chatController = {
  async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const { requestId } = req.params;

      const hasAccess = await verifyConversationAccess(req.user.id, requestId);
      if (!hasAccess) throw new AppError('Access denied', 403);

      const conversation = await prisma.conversation.findUnique({
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

      if (!conversation) throw new AppError('Conversation not found', 404);
      res.json({ success: true, data: conversation });
    } catch (err) {
      next(err);
    }
  },

  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const { requestId } = req.params;
      const cursor = req.query.cursor as string | undefined;
      const limit = Number(req.query.limit ?? 30);

      const hasAccess = await verifyConversationAccess(req.user.id, requestId);
      if (!hasAccess) throw new AppError('Access denied', 403);

      const conversation = await prisma.conversation.findUnique({ where: { requestId } });
      if (!conversation) throw new AppError('Conversation not found', 404);

      const messages = await prisma.message.findMany({
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
    } catch (err) {
      next(err);
    }
  },

  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const { requestId } = req.params;

      const hasAccess = await verifyConversationAccess(req.user.id, requestId);
      if (!hasAccess) throw new AppError('Access denied', 403);

      const conversation = await prisma.conversation.findUnique({ where: { requestId } });
      if (!conversation) throw new AppError('Conversation not found', 404);

      const message = await prisma.message.create({
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
      const io = getSocketServer();
      io?.to(`request:${requestId}`).emit('new_message', message);

      res.status(201).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      await prisma.message.update({
        where: { id: req.params.messageId },
        data: { isRead: true, readAt: new Date() },
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      const count = await prisma.message.count({
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
    } catch (err) {
      next(err);
    }
  },
};
