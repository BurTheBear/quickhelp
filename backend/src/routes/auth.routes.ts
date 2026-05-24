import { Router } from 'express';
import { z } from 'zod';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(50),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const firebaseSchema = z.object({
  idToken: z.string().min(1),
  displayName: z.string().min(2).max(50).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

authRouter.post('/signup', authRateLimiter, validate(signupSchema), authController.signup);
authRouter.post('/login', authRateLimiter, validate(loginSchema), authController.login);
authRouter.post('/firebase', authRateLimiter, validate(firebaseSchema), authController.firebaseAuth);
authRouter.post('/refresh', validate(refreshSchema), authController.refreshToken);
authRouter.post('/logout', authenticate, authController.logout);
authRouter.post('/forgot-password', authRateLimiter, authController.forgotPassword);
authRouter.post('/reset-password', authRateLimiter, authController.resetPassword);
authRouter.get('/me', authenticate, authController.getMe);
