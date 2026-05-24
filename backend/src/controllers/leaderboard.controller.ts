import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { cache } from '../config/redis.js';
import { AppError } from '../middleware/errorHandler.js';

async function getLeaderboard(field: 'totalXp' | 'weeklyXp' | 'monthlyXp', limit = 50) {
  const cacheKey = `leaderboard:${field}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const results = await prisma.userGamification.findMany({
    where: { user: { status: 'ACTIVE', profile: { isNot: null } } },
    orderBy: { [field]: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          verificationLevel: true,
          profile: {
            select: { displayName: true, avatarUrl: true, city: true, tasksCompleted: true },
          },
        },
      },
    },
  });

  const ranked = results.map((r, idx) => ({
    rank: idx + 1,
    userId: r.userId,
    displayName: r.user.profile?.displayName,
    avatarUrl: r.user.profile?.avatarUrl,
    city: r.user.profile?.city,
    verificationLevel: r.user.verificationLevel,
    tasksCompleted: r.user.profile?.tasksCompleted,
    xp: r[field],
    level: r.level,
    levelName: r.levelName,
  }));

  await cache.set(cacheKey, ranked, 300); // 5 min cache
  return ranked;
}

export const leaderboardController = {
  async getGlobal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await getLeaderboard('totalXp');
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getWeekly(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await getLeaderboard('weeklyXp');
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getMonthly(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await getLeaderboard('monthlyXp');
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getNearby(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      const profile = await prisma.userProfile.findUnique({
        where: { userId: req.user.id },
        select: { city: true },
      });

      if (!profile?.city) {
        res.json({ success: true, data: [] });
        return;
      }

      const data = await prisma.userGamification.findMany({
        where: {
          user: {
            status: 'ACTIVE',
            profile: { city: profile.city },
          },
        },
        orderBy: { totalXp: 'desc' },
        take: 20,
        include: {
          user: {
            select: {
              id: true,
              profile: { select: { displayName: true, avatarUrl: true, city: true, tasksCompleted: true } },
            },
          },
        },
      });

      res.json({ success: true, data: data.map((r, i) => ({ rank: i + 1, ...r })) });
    } catch (err) {
      next(err);
    }
  },

  async getChallenges(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = new Date();
      const challenges = await prisma.challenge.findMany({
        where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
        orderBy: { endDate: 'asc' },
      });
      res.json({ success: true, data: challenges });
    } catch (err) {
      next(err);
    }
  },
};
