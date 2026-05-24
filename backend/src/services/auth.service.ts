import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database.js';
import { cache } from '../config/redis.js';
import { config } from '../config/index.js';
import { getFirebaseAuth } from '../config/firebase.js';
import { gamificationService } from './gamification.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { UserRole } from '@prisma/client';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthResult extends AuthTokens {
  user: {
    id: string;
    email: string;
    role: UserRole;
    profile: {
      displayName: string;
      avatarUrl: string | null;
    } | null;
  };
}

const SALT_ROUNDS = 12;

function generateTokens(userId: string, email: string, role: UserRole): AuthTokens {
  const accessToken = jwt.sign(
    { sub: userId, email, role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh', jti: uuidv4() },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken, expiresIn: 15 * 60 }; // 15 min in seconds
}

export const authService = {
  async signup(input: { email: string; password: string; displayName: string }): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError('Email already in use', 409);

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        profile: {
          create: {
            displayName: input.displayName,
          },
        },
        gamification: {
          create: {},
        },
        streaks: {
          create: {},
        },
      },
      include: { profile: true },
    });

    // Award "Welcome" XP
    await gamificationService.awardXP(user.id, 10, 'Welcome to QuickHelp!');

    const tokens = generateTokens(user.id, user.email, user.role);
    await cache.set(`refresh:${tokens.refreshToken}`, user.id, 30 * 24 * 60 * 60);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile
          ? { displayName: user.profile.displayName, avatarUrl: user.profile.avatarUrl }
          : null,
      },
    };
  },

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user || !user.passwordHash) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new AppError('Invalid email or password', 401);

    if (user.status === 'SUSPENDED') throw new AppError('Account suspended', 403);
    if (user.status === 'BANNED') throw new AppError('Account banned', 403);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const tokens = generateTokens(user.id, user.email, user.role);
    await cache.set(`refresh:${tokens.refreshToken}`, user.id, 30 * 24 * 60 * 60);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile
          ? { displayName: user.profile.displayName, avatarUrl: user.profile.avatarUrl }
          : null,
      },
    };
  },

  async firebaseAuth(idToken: string, displayName?: string): Promise<AuthResult> {
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) throw new AppError('Firebase auth not configured', 503);

    let firebaseUser;
    try {
      firebaseUser = await firebaseAuth.verifyIdToken(idToken);
    } catch {
      throw new AppError('Invalid Firebase token', 401);
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { firebaseUid: firebaseUser.uid },
          { email: firebaseUser.email! },
        ],
      },
      include: { profile: true },
    });

    if (!user) {
      // New user via Firebase (Google, Apple, etc.)
      user = await prisma.user.create({
        data: {
          email: firebaseUser.email!,
          firebaseUid: firebaseUser.uid,
          profile: {
            create: {
              displayName: displayName ?? firebaseUser.name ?? firebaseUser.email!.split('@')[0],
              avatarUrl: firebaseUser.picture ?? null,
            },
          },
          gamification: { create: {} },
          streaks: { create: {} },
        },
        include: { profile: true },
      });

      await gamificationService.awardXP(user.id, 10, 'Welcome to QuickHelp!');
    } else if (!user.firebaseUid) {
      // Existing email user linking their Google account
      user = await prisma.user.update({
        where: { id: user.id },
        data: { firebaseUid: firebaseUser.uid },
        include: { profile: true },
      });
    }

    const tokens = generateTokens(user.id, user.email, user.role);
    await cache.set(`refresh:${tokens.refreshToken}`, user.id, 30 * 24 * 60 * 60);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile
          ? { displayName: user.profile.displayName, avatarUrl: user.profile.avatarUrl }
          : null,
      },
    };
  },

  async refreshToken(refreshToken: string): Promise<Pick<AuthTokens, 'accessToken' | 'expiresIn'>> {
    let payload: { sub: string };
    try {
      payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as { sub: string };
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }

    const userId = await cache.get<string>(`refresh:${refreshToken}`);
    if (!userId || userId !== payload.sub) {
      throw new AppError('Refresh token revoked or expired', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('User unavailable', 401);
    }

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    return { accessToken, expiresIn: 15 * 60 };
  },

  async logout(accessToken: string): Promise<void> {
    // Blacklist the token until it expires
    try {
      const payload = jwt.decode(accessToken) as { exp: number };
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await cache.set(`blacklist:${accessToken}`, true, ttl);
      }
    } catch {}
  },

  async sendPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // Silent fail to prevent enumeration

    const resetToken = uuidv4();
    await cache.set(`password-reset:${resetToken}`, user.id, 60 * 60); // 1 hour

    // In production: send email via SES/SendGrid with reset link
    // For now, log it in dev
    console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await cache.get<string>(`password-reset:${token}`);
    if (!userId) throw new AppError('Invalid or expired reset token', 400);

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await cache.del(`password-reset:${token}`);
  },

  async getMe(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        verificationLevel: true,
        createdAt: true,
        lastActiveAt: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            bio: true,
            skills: true,
            interests: true,
            city: true,
            state: true,
            isAvailable: true,
            tasksCompleted: true,
            avgRating: true,
            totalRatings: true,
          },
        },
        gamification: {
          select: {
            totalXp: true,
            level: true,
            levelName: true,
            currentLevelXp: true,
            nextLevelXp: true,
          },
        },
        streaks: {
          select: { currentStreak: true, longestStreak: true },
        },
      },
    });
  },
};
