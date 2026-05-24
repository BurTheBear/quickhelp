import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export const notificationController = {
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);

      const [notifications, total, unread] = await Promise.all([
        prisma.notification.findMany({
          where: { userId: req.user.id },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.notification.count({ where: { userId: req.user.id } }),
        prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
      ]);

      res.json({
        success: true,
        data: { notifications, total, unread, page, hasMore: page * limit < total },
      });
    } catch (err) {
      next(err);
    }
  },

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const count = await prisma.notification.count({
        where: { userId: req.user.id, isRead: false },
      });
      res.json({ success: true, data: { count } });
    } catch (err) {
      next(err);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      await prisma.notification.updateMany({
        where: { id: req.params.id, userId: req.user.id },
        data: { isRead: true, readAt: new Date() },
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      await prisma.notification.updateMany({
        where: { userId: req.user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      await prisma.notification.deleteMany({
        where: { id: req.params.id, userId: req.user.id },
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
};
