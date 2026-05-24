import { prisma } from '../config/database.js';
import { notificationService } from './notification.service.js';
import { logger } from '../utils/logger.js';

// XP thresholds for each level
const LEVEL_THRESHOLDS = [
  0,      // Level 1 - Newcomer
  100,    // Level 2 - Helper
  300,    // Level 3 - Volunteer
  700,    // Level 4 - Community Member
  1500,   // Level 5 - Local Hero
  3000,   // Level 6 - Neighborhood Champion
  5500,   // Level 7 - City Guardian
  9000,   // Level 8 - Regional Legend
  14000,  // Level 9 - Impact Maker
  21000,  // Level 10 - Community Legend
];

const LEVEL_NAMES = [
  'Newcomer', 'Helper', 'Volunteer', 'Community Member',
  'Local Hero', 'Neighborhood Champion', 'City Guardian',
  'Regional Legend', 'Impact Maker', 'Community Legend',
];

function getLevelFromXP(totalXp: number): { level: number; levelName: string; currentLevelXp: number; nextLevelXp: number } {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const levelIndex = level - 1;
  const currentLevelXp = totalXp - (LEVEL_THRESHOLDS[levelIndex] ?? 0);
  const nextLevelThreshold = LEVEL_THRESHOLDS[levelIndex + 1];
  const nextLevelXp = nextLevelThreshold
    ? nextLevelThreshold - (LEVEL_THRESHOLDS[levelIndex] ?? 0)
    : 9999;

  return {
    level,
    levelName: LEVEL_NAMES[levelIndex] ?? 'Community Legend',
    currentLevelXp,
    nextLevelXp,
  };
}

export const gamificationService = {
  async awardXP(userId: string, amount: number, reason: string, referenceId?: string): Promise<void> {
    try {
      const gamification = await prisma.userGamification.upsert({
        where: { userId },
        create: { userId, totalXp: amount },
        update: {
          totalXp: { increment: amount },
          weeklyXp: { increment: amount },
          monthlyXp: { increment: amount },
        },
      });

      await prisma.xPEvent.create({
        data: {
          gamificationId: gamification.id,
          amount,
          reason,
          referenceId,
        },
      });

      const newTotalXp = gamification.totalXp + amount;
      const { level, levelName, currentLevelXp, nextLevelXp } = getLevelFromXP(newTotalXp);

      const oldLevel = gamification.level;
      if (level !== oldLevel) {
        await prisma.userGamification.update({
          where: { userId },
          data: { level, levelName, currentLevelXp, nextLevelXp },
        });

        // Notify level up
        await notificationService.create(userId, {
          type: 'LEVEL_UP',
          title: `Level Up! You're now level ${level}`,
          body: `Welcome to ${levelName}! Keep helping your community.`,
          data: { level, levelName },
        });
      } else {
        await prisma.userGamification.update({
          where: { userId },
          data: { currentLevelXp, nextLevelXp },
        });
      }

      // Check badge eligibility async
      this.checkBadgeEligibility(userId).catch(() => {});
    } catch (err) {
      logger.error(`Failed to award XP to ${userId}:`, err);
    }
  },

  async updateStreak(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const streak = await prisma.userStreak.upsert({
      where: { userId },
      create: { userId, currentStreak: 1, longestStreak: 1, lastActivityDate: today },
      update: {},
    });

    if (!streak.lastActivityDate) {
      await prisma.userStreak.update({
        where: { userId },
        data: { currentStreak: 1, longestStreak: 1, lastActivityDate: today },
      });
      return;
    }

    const lastActivity = new Date(streak.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return; // Already active today

    if (diffDays === 1) {
      // Continuing streak
      const newStreak = streak.currentStreak + 1;
      const newLongest = Math.max(newStreak, streak.longestStreak);

      await prisma.userStreak.update({
        where: { userId },
        data: { currentStreak: newStreak, longestStreak: newLongest, lastActivityDate: today },
      });

      // Milestone rewards
      if ([7, 30, 100, 365].includes(newStreak)) {
        const bonus = newStreak >= 365 ? 500 : newStreak >= 100 ? 200 : newStreak >= 30 ? 100 : 50;
        await this.awardXP(userId, bonus, `${newStreak}-day streak bonus!`);
        await notificationService.create(userId, {
          type: 'STREAK_MILESTONE',
          title: `🔥 ${newStreak}-Day Streak!`,
          body: `You've been helping for ${newStreak} days straight. +${bonus} XP bonus!`,
          data: { streak: newStreak, bonus },
        });
      }
    } else {
      // Streak broken
      await prisma.userStreak.update({
        where: { userId },
        data: { currentStreak: 1, lastActivityDate: today },
      });
    }
  },

  async checkBadgeEligibility(userId: string): Promise<void> {
    const [profile, gamification, earnedBadgeIds] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId },
        select: { tasksCompleted: true, avgRating: true },
      }),
      prisma.userGamification.findUnique({
        where: { userId },
        select: { totalXp: true, level: true },
      }),
      prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true },
      }),
    ]);

    if (!profile || !gamification) return;

    const earned = new Set(earnedBadgeIds.map((b) => b.badgeId));
    const badges = await prisma.badge.findMany({ where: { isActive: true } });

    for (const badge of badges) {
      if (earned.has(badge.id)) continue;

      const criteria = badge.criteria as { type: string; threshold: number; category?: string };
      let eligible = false;

      switch (criteria.type) {
        case 'tasks_completed':
          eligible = profile.tasksCompleted >= criteria.threshold;
          break;
        case 'level_reached':
          eligible = gamification.level >= criteria.threshold;
          break;
        case 'rating_above':
          eligible = profile.avgRating >= criteria.threshold;
          break;
        case 'total_xp':
          eligible = gamification.totalXp >= criteria.threshold;
          break;
      }

      if (eligible) {
        await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
        await this.awardXP(userId, badge.xpReward, `Earned badge: ${badge.name}`, badge.id);
        await notificationService.create(userId, {
          type: 'BADGE_EARNED',
          title: `Badge Earned: ${badge.name}`,
          body: badge.description,
          data: { badge: { id: badge.id, name: badge.name, iconUrl: badge.iconUrl } },
        });
      }
    }
  },

  async updateChallengeProgress(userId: string, category: string): Promise<void> {
    const now = new Date();
    const activeChallenges = await prisma.challenge.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [{ category }, { category: 'ALL' }],
      },
    });

    for (const challenge of activeChallenges) {
      const progress = await prisma.userChallengeProgress.upsert({
        where: { userId_challengeId: { userId, challengeId: challenge.id } },
        create: { userId, challengeId: challenge.id, progress: 1 },
        update: { progress: { increment: 1 } },
      });

      if (progress.progress >= challenge.goal && !progress.completedAt) {
        await prisma.userChallengeProgress.update({
          where: { userId_challengeId: { userId, challengeId: challenge.id } },
          data: { completedAt: now },
        });

        await this.awardXP(userId, challenge.xpReward, `Challenge completed: ${challenge.title}`, challenge.id);

        await notificationService.create(userId, {
          type: 'CHALLENGE_COMPLETED',
          title: `Challenge Complete!`,
          body: `You completed "${challenge.title}" and earned ${challenge.xpReward} XP!`,
          data: { challenge: { id: challenge.id, title: challenge.title, xpReward: challenge.xpReward } },
        });
      }
    }
  },
};
