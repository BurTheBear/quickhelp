import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export const adminController = {
  async getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = new Date();
      const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
      const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
      const startOfMonth = new Date(now); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

      const [
        totalUsers,
        newUsersToday,
        newUsersWeek,
        totalRequests,
        openRequests,
        completedRequests,
        completedToday,
        totalMatches,
        pendingReports,
        flaggedRequests,
        totalXpAwarded,
      ] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
        prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
        prisma.helpRequest.count({ where: { deletedAt: null } }),
        prisma.helpRequest.count({ where: { status: 'OPEN' } }),
        prisma.helpRequest.count({ where: { status: 'COMPLETED' } }),
        prisma.helpRequest.count({ where: { status: 'COMPLETED', completedAt: { gte: startOfToday } } }),
        prisma.match.count(),
        prisma.report.count({ where: { status: 'PENDING' } }),
        prisma.helpRequest.count({ where: { isFlagged: true, deletedAt: null } }),
        prisma.userGamification.aggregate({ _sum: { totalXp: true } }),
      ]);

      // Request volume by day (last 30 days)
      const requestsByDay = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM help_requests
        WHERE "createdAt" >= ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `;

      // Category breakdown
      const categoryBreakdown = await prisma.helpRequest.groupBy({
        by: ['category'],
        _count: true,
        where: { deletedAt: null },
      });

      res.json({
        success: true,
        data: {
          users: { total: totalUsers, today: newUsersToday, thisWeek: newUsersWeek },
          requests: { total: totalRequests, open: openRequests, completed: completedRequests, completedToday, flagged: flaggedRequests },
          matches: { total: totalMatches },
          moderation: { pendingReports, flaggedRequests },
          gamification: { totalXpAwarded: totalXpAwarded._sum.totalXp ?? 0 },
          charts: {
            requestsByDay: requestsByDay.map((r) => ({ date: r.date, count: Number(r.count) })),
            categoryBreakdown: categoryBreakdown.map((c) => ({ category: c.category, count: c._count })),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [avgCompletionRate, avgRating, topCategories, topVolunteers] = await Promise.all([
        prisma.helpRequest.count({ where: { status: 'COMPLETED' } }).then(async (completed) => {
          const total = await prisma.helpRequest.count({ where: { deletedAt: null } });
          return total > 0 ? (completed / total) * 100 : 0;
        }),
        prisma.rating.aggregate({ _avg: { score: true } }),
        prisma.helpRequest.groupBy({
          by: ['category'],
          _count: true,
          where: { status: 'COMPLETED' },
          orderBy: { _count: { category: 'desc' } },
          take: 5,
        }),
        prisma.userProfile.findMany({
          where: { tasksCompleted: { gt: 0 } },
          orderBy: { tasksCompleted: 'desc' },
          take: 10,
          select: { displayName: true, tasksCompleted: true, avgRating: true, userId: true },
        }),
      ]);

      res.json({
        success: true,
        data: {
          avgCompletionRate: Math.round(avgCompletionRate),
          avgRating: avgRating._avg.score ?? 0,
          topCategories,
          topVolunteers,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;

      const where = {
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
        ...(search
          ? {
              OR: [
                { email: { contains: search, mode: 'insensitive' as const } },
                { profile: { displayName: { contains: search, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            profile: { select: { displayName: true, avatarUrl: true, tasksCompleted: true, avgRating: true } },
            gamification: { select: { totalXp: true, level: true } },
            _count: { select: { helpRequestsMade: true, matchesAsVolunteer: true, reportedBy: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      res.json({ success: true, data: { users, total, page, hasMore: page * limit < total } });
    } catch (err) {
      next(err);
    }
  },

  async getUserDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        include: {
          profile: true,
          gamification: true,
          streaks: true,
          userBadges: { include: { badge: true } },
          reportedBy: { take: 10 },
          helpRequestsMade: { take: 5, orderBy: { createdAt: 'desc' } },
        },
      });
      if (!user) throw new AppError('User not found', 404);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body;
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { status },
      });

      // Invalidate user cache
      const { cache } = await import('../config/redis.js');
      await cache.del(`user:${req.params.id}:role`);

      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role } = req.body;
      const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
      const { cache } = await import('../config/redis.js');
      await cache.del(`user:${req.params.id}:role`);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date(), status: 'BANNED' },
      });
      res.json({ success: true, message: 'User deleted' });
    } catch (err) {
      next(err);
    }
  },

  async listRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const status = req.query.status as string | undefined;
      const flagged = req.query.flagged === 'true';

      const [requests, total] = await Promise.all([
        prisma.helpRequest.findMany({
          where: {
            deletedAt: null,
            ...(status ? { status: status as never } : {}),
            ...(flagged ? { isFlagged: true } : {}),
          },
          include: {
            author: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
            _count: { select: { reports: true, matches: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.helpRequest.count({ where: { deletedAt: null } }),
      ]);

      res.json({ success: true, data: { requests, total, page } });
    } catch (err) {
      next(err);
    }
  },

  async flagRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await prisma.helpRequest.update({ where: { id: req.params.id }, data: { isFlagged: true } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async unflagRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await prisma.helpRequest.update({ where: { id: req.params.id }, data: { isFlagged: false } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async deleteRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await prisma.helpRequest.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date(), status: 'CANCELLED' },
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async listReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = 20;
      const status = (req.query.status as string) ?? 'PENDING';

      const [reports, total] = await Promise.all([
        prisma.report.findMany({
          where: { status: status as never },
          include: {
            author: { select: { id: true, profile: { select: { displayName: true } } } },
            reportedUser: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
            reportedRequest: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.report.count({ where: { status: status as never } }),
      ]);

      res.json({ success: true, data: { reports, total, page } });
    } catch (err) {
      next(err);
    }
  },

  async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await prisma.report.findUnique({
        where: { id: req.params.id },
        include: {
          author: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
          reportedUser: true,
          reportedRequest: true,
        },
      });
      if (!report) throw new AppError('Report not found', 404);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  },

  async resolveReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      await prisma.report.update({
        where: { id: req.params.id },
        data: { status: 'RESOLVED', resolvedById: req.user.id, resolvedAt: new Date(), adminNotes: req.body.notes },
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async dismissReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      await prisma.report.update({
        where: { id: req.params.id },
        data: { status: 'DISMISSED', resolvedById: req.user.id, resolvedAt: new Date() },
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async getFlaggedContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requests = await prisma.helpRequest.findMany({
        where: { isFlagged: true, deletedAt: null },
        include: {
          author: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
          _count: { select: { reports: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.json({ success: true, data: requests });
    } catch (err) {
      next(err);
    }
  },

  async listBadges(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const badges = await prisma.badge.findMany({ orderBy: { createdAt: 'desc' } });
      res.json({ success: true, data: badges });
    } catch (err) {
      next(err);
    }
  },

  async createBadge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const badge = await prisma.badge.create({ data: req.body });
      res.status(201).json({ success: true, data: badge });
    } catch (err) {
      next(err);
    }
  },

  async updateBadge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const badge = await prisma.badge.update({ where: { id: req.params.id }, data: req.body });
      res.json({ success: true, data: badge });
    } catch (err) {
      next(err);
    }
  },

  async listChallenges(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challenges = await prisma.challenge.findMany({ orderBy: { createdAt: 'desc' } });
      res.json({ success: true, data: challenges });
    } catch (err) {
      next(err);
    }
  },

  async createChallenge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challenge = await prisma.challenge.create({ data: req.body });
      res.status(201).json({ success: true, data: challenge });
    } catch (err) {
      next(err);
    }
  },

  async updateChallenge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challenge = await prisma.challenge.update({ where: { id: req.params.id }, data: req.body });
      res.json({ success: true, data: challenge });
    } catch (err) {
      next(err);
    }
  },
};
