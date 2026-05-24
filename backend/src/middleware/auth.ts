import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/database.js';
import { cache } from '../config/redis.js';
import { AppError } from './errorHandler.js';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;        // userId
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = authHeader.slice(7);

    // Check if token is blacklisted (logout)
    const isBlacklisted = await cache.get<boolean>(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new AppError('Token has been revoked', 401);
    }

    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    // Cache user lookup to reduce DB hits
    const cacheKey = `user:${payload.sub}:role`;
    let role = await cache.get<UserRole>(cacheKey);

    if (!role) {
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, status: true },
      });

      if (!user) throw new AppError('User not found', 401);
      if (user.status === 'SUSPENDED') throw new AppError('Account suspended', 403);
      if (user.status === 'BANNED') throw new AppError('Account banned', 403);

      role = user.role;
      await cache.set(cacheKey, role, 300); // 5 min cache
    }

    req.user = { id: payload.sub, email: payload.email, role };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else {
      next(err);
    }
  }
};

export const requireRole = (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError('Insufficient permissions', 403));
      return;
    }
    next();
  };

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }
  authenticate(req, _res, next);
};
