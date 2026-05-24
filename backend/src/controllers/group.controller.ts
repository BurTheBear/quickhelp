import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export const groupController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { city, search } = req.query;
      const groups = await prisma.communityGroup.findMany({
        where: {
          isPublic: true,
          ...(city ? { city: { contains: String(city), mode: 'insensitive' } } : {}),
          ...(search ? { name: { contains: String(search), mode: 'insensitive' } } : {}),
        },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      res.json({ success: true, data: groups });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const group = await prisma.communityGroup.findUnique({
        where: { id: req.params.id },
        include: {
          _count: { select: { members: true } },
          members: {
            take: 10,
            include: {
              user: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
            },
          },
        },
      });
      if (!group) throw new AppError('Group not found', 404);
      res.json({ success: true, data: group });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const group = await prisma.communityGroup.create({
        data: { ...req.body, createdById: req.user.id },
      });
      await prisma.groupMember.create({
        data: { groupId: group.id, userId: req.user.id, role: 'ADMIN' },
      });
      res.status(201).json({ success: true, data: group });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const isMod = await prisma.groupMember.findFirst({
        where: { groupId: req.params.id, userId: req.user.id, role: { in: ['ADMIN', 'MODERATOR'] } },
      });
      if (!isMod && req.user.role !== 'ADMIN') throw new AppError('Forbidden', 403);

      const group = await prisma.communityGroup.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({ success: true, data: group });
    } catch (err) {
      next(err);
    }
  },

  async join(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const existing = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: req.params.id, userId: req.user.id } },
      });
      if (existing) throw new AppError('Already a member', 409);

      await prisma.groupMember.create({
        data: { groupId: req.params.id, userId: req.user.id },
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async leave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      await prisma.groupMember.deleteMany({
        where: { groupId: req.params.id, userId: req.user.id },
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const members = await prisma.groupMember.findMany({
        where: { groupId: req.params.id },
        include: {
          user: {
            select: {
              id: true,
              profile: { select: { displayName: true, avatarUrl: true, tasksCompleted: true } },
              gamification: { select: { level: true, levelName: true } },
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
        take: 50,
      });
      res.json({ success: true, data: members });
    } catch (err) {
      next(err);
    }
  },
};
