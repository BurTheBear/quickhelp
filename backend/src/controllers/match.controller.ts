import { Request, Response, NextFunction } from 'express';
import { matchService } from '../services/match.service.js';
import { AppError } from '../middleware/errorHandler.js';

export const matchController = {
  async acceptRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const match = await matchService.acceptRequest(req.params.requestId, req.user.id);
      res.status(201).json({ success: true, data: match });
    } catch (err) {
      next(err);
    }
  },

  async startTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const match = await matchService.startTask(req.params.id, req.user.id);
      res.json({ success: true, data: match });
    } catch (err) {
      next(err);
    }
  },

  async completeTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const match = await matchService.completeTask(req.params.id, req.user.id);
      res.json({ success: true, data: match });
    } catch (err) {
      next(err);
    }
  },

  async requestCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const match = await matchService.requestCompletion(req.params.id, req.user.id);
      res.json({ success: true, data: match });
    } catch (err) {
      next(err);
    }
  },

  async approveCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const match = await matchService.approveCompletion(req.params.id, req.user.id);
      res.json({ success: true, data: match });
    } catch (err) {
      next(err);
    }
  },

  async cancelMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      await matchService.cancelMatch(req.params.id, req.user.id, req.body.reason);
      res.json({ success: true, message: 'Match cancelled' });
    } catch (err) {
      next(err);
    }
  },

  async getActiveMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const matches = await matchService.getActiveMatches(req.user.id);
      res.json({ success: true, data: matches });
    } catch (err) {
      next(err);
    }
  },

  async getMatchHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const { prisma } = await import('../config/database.js');
      const matches = await prisma.match.findMany({
        where: { volunteerId: req.user.id, status: 'COMPLETED' },
        include: {
          request: {
            select: { id: true, title: true, category: true, completedAt: true, rewardPoints: true },
          },
          ratings: {
            where: { recipientId: req.user.id },
            select: { score: true, comment: true },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 50,
      });
      res.json({ success: true, data: matches });
    } catch (err) {
      next(err);
    }
  },
};
