import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { userController } from '../controllers/user.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export const userRouter = Router();

// ─── Disk upload (no S3 needed for dev) ──────────────────────────────────────
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `avatar-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
});

// ─── Schemas ──────────────────────────────────────────────────────────────────
const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().max(2000).optional(), // emoji:// or https:// URL
  skills: z.array(z.string()).max(10).optional(),
  interests: z.array(z.string()).max(10).optional(),
  languages: z.array(z.string()).max(5).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  radius: z.number().min(1).max(100).optional(),
  isAvailable: z.boolean().optional(),
});

const ratingSchema = z.object({
  requestId: z.string().cuid(),
  recipientId: z.string().cuid(),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  tags: z.array(z.string()).max(5).default([]),
});

// ─── Routes ───────────────────────────────────────────────────────────────────
userRouter.get('/profile/:id', optionalAuth, userController.getProfile);
userRouter.get('/me/stats', authenticate, userController.getMyStats);
userRouter.get('/me/badges', authenticate, userController.getMyBadges);
userRouter.get('/me/achievements', authenticate, userController.getMyAchievements);
userRouter.put('/me/profile', authenticate, validate(updateProfileSchema), userController.updateProfile);

// Avatar upload — multipart (real photo) OR JSON avatarUrl (emoji)
userRouter.post('/me/avatar', authenticate, upload.single('avatar'), userController.uploadAvatar);

userRouter.post('/me/location', authenticate, userController.updateLocation);
userRouter.post('/me/device-token', authenticate, userController.registerDeviceToken);
userRouter.delete('/me/device-token', authenticate, userController.removeDeviceToken);
userRouter.post('/rate', authenticate, validate(ratingSchema), userController.rateUser);
userRouter.post('/:id/report', authenticate, userController.reportUser);
