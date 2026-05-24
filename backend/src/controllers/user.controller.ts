import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { gamificationService } from '../services/gamification.service.js';
import { config } from '../config/index.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

export const userController = {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id, deletedAt: null },
        select: {
          id: true,
          role: true,
          verificationLevel: true,
          createdAt: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
              bio: true,
              skills: true,
              interests: true,
              city: true,
              state: true,
              tasksCompleted: true,
              avgRating: true,
              totalRatings: true,
              isAvailable: true,
            },
          },
          gamification: {
            select: { totalXp: true, level: true, levelName: true, currentLevelXp: true, nextLevelXp: true },
          },
          userBadges: {
            where: { isDisplayed: true },
            include: { badge: { select: { id: true, name: true, iconUrl: true, rarity: true } } },
            take: 6,
            orderBy: { earnedAt: 'desc' },
          },
          streaks: { select: { currentStreak: true, longestStreak: true } },
        },
      });

      if (!user) throw new AppError('User not found', 404);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  async getMyStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      const [profile, gamification, streaks, recentActivity] = await Promise.all([
        prisma.userProfile.findUnique({
          where: { userId: req.user.id },
          select: { tasksCompleted: true, tasksRequested: true, avgRating: true, totalRatings: true },
        }),
        prisma.userGamification.findUnique({
          where: { userId: req.user.id },
          select: { totalXp: true, weeklyXp: true, monthlyXp: true, level: true, levelName: true },
        }),
        prisma.userStreak.findUnique({
          where: { userId: req.user.id },
          select: { currentStreak: true, longestStreak: true },
        }),
        prisma.match.findMany({
          where: { volunteerId: req.user.id, status: 'COMPLETED' },
          select: {
            completedAt: true,
            request: { select: { category: true, estimatedMinutes: true } },
          },
          orderBy: { completedAt: 'desc' },
          take: 10,
        }),
      ]);

      // Calculate total volunteer minutes
      const totalMinutes = recentActivity.reduce(
        (sum, m) => sum + (m.request.estimatedMinutes ?? 0),
        0
      );

      // Category breakdown
      const categoryMap: Record<string, number> = {};
      recentActivity.forEach((m) => {
        const cat = m.request.category;
        categoryMap[cat] = (categoryMap[cat] ?? 0) + 1;
      });

      res.json({
        success: true,
        data: { profile, gamification, streaks, totalMinutes, categoryBreakdown: categoryMap },
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyBadges(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      const [earned, all] = await Promise.all([
        prisma.userBadge.findMany({
          where: { userId: req.user.id },
          include: { badge: true },
          orderBy: { earnedAt: 'desc' },
        }),
        prisma.badge.findMany({ where: { isActive: true }, orderBy: { rarity: 'asc' } }),
      ]);

      const earnedIds = new Set(earned.map((e) => e.badgeId));
      const notEarned = all.filter((b) => !earnedIds.has(b.id));

      res.json({ success: true, data: { earned, notEarned } });
    } catch (err) {
      next(err);
    }
  },

  async getMyAchievements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      const achievements = await prisma.userAchievement.findMany({
        where: { userId: req.user.id },
        include: { achievement: true },
        orderBy: { updatedAt: 'desc' },
      });

      res.json({ success: true, data: achievements });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      const profile = await prisma.userProfile.update({
        where: { userId: req.user.id },
        data: req.body,
      });

      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  },

  async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      // Case 1: actual file upload (multipart/form-data from camera/gallery)
      const file = (req as any).file as { path?: string; location?: string; filename?: string } | undefined;
      let avatarUrl: string | null = null;

      if (file) {
        // Priority: S3 (file.location) → Cloudinary → local disk
        if (file.location) {
          avatarUrl = file.location; // S3 managed by multer-s3
        } else if (file.path) {
          // Try Cloudinary first (production); fall back to local URL
          const cloudUrl = await uploadToCloudinary(file.path, 'quickhelp/avatars', 'image');
          if (cloudUrl) {
            avatarUrl = cloudUrl;
          } else if (file.filename) {
            const baseUrl = process.env.API_BASE_URL ?? `http://localhost:${config.PORT ?? 4000}`;
            avatarUrl = `${baseUrl}/uploads/${file.filename}`;
          }
        }
      }

      // Case 2: emoji:// string sent as JSON body field (fallback / emoji avatar)
      if (!avatarUrl && req.body?.avatarUrl) {
        avatarUrl = req.body.avatarUrl;
      }

      if (!avatarUrl) throw new AppError('No file or avatarUrl provided', 400);

      const profile = await prisma.userProfile.update({
        where: { userId: req.user.id },
        data: { avatarUrl },
      });

      res.json({ success: true, data: { avatarUrl: profile.avatarUrl } });
    } catch (err) {
      next(err);
    }
  },

  async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const { latitude, longitude, city, state } = req.body;

      await prisma.userProfile.update({
        where: { userId: req.user.id },
        data: { latitude, longitude, ...(city ? { city } : {}), ...(state ? { state } : {}) },
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async registerDeviceToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const { fcmToken, platform, deviceModel, appVersion } = req.body;

      await prisma.userDevice.upsert({
        where: { fcmToken },
        create: { userId: req.user.id, fcmToken, platform, deviceModel, appVersion, isActive: true },
        update: { userId: req.user.id, platform, deviceModel, appVersion, isActive: true },
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async removeDeviceToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const { fcmToken } = req.body;

      await prisma.userDevice.updateMany({
        where: { userId: req.user.id, fcmToken },
        data: { isActive: false },
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async rateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const { requestId, recipientId, score, comment, tags } = req.body;

      // Verify request exists and user has access
      const request = await prisma.helpRequest.findFirst({
        where: {
          id: requestId,
          status: 'COMPLETED',
          OR: [
            { authorId: req.user.id },
            { matches: { some: { volunteerId: req.user.id, status: 'COMPLETED' } } },
          ],
        },
      });

      if (!request) throw new AppError('Cannot rate this request', 400);

      const rating = await prisma.rating.create({
        data: {
          requestId,
          authorId: req.user.id,
          recipientId,
          score,
          comment,
          tags: tags ?? [],
        },
      });

      // Update recipient's average rating
      const stats = await prisma.rating.aggregate({
        where: { recipientId },
        _avg: { score: true },
        _count: { score: true },
      });

      await prisma.userProfile.update({
        where: { userId: recipientId },
        data: {
          avgRating: stats._avg.score ?? 0,
          totalRatings: stats._count.score,
        },
      });

      // Bonus XP for 5-star ratings
      if (score === 5) {
        await gamificationService.awardXP(recipientId, 25, 'Received a 5-star rating!', requestId);
      }

      res.status(201).json({ success: true, data: rating });
    } catch (err) {
      next(err);
    }
  },

  async reportUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      await prisma.report.create({
        data: {
          authorId: req.user.id,
          reportedUserId: req.params.id,
          reason: req.body.reason,
          description: req.body.description ?? '',
        },
      });

      res.json({ success: true, message: 'Report submitted' });
    } catch (err) {
      next(err);
    }
  },
};
