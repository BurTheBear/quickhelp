import { Router } from 'express';
import { z } from 'zod';
import { requestController } from '../controllers/request.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadRateLimiter } from '../middleware/rateLimiter.js';

export const requestRouter = Router();

const createRequestSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(1000),
  category: z.enum([
    'ELDERLY_ASSISTANCE', 'TUTORING', 'FOOD_DELIVERY',
    'COMMUNITY_CLEANUP', 'PET_HELP', 'TECH_SUPPORT',
    'TRANSPORTATION', 'EMERGENCY', 'OTHER',
  ]),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']).default('MEDIUM'),
  estimatedMinutes: z.number().min(5).max(480).default(30),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().max(200).optional(),
  locationNotes: z.string().max(200).optional(),
  requiredSkills: z.array(z.string()).max(5).default([]),
  expiresInHours: z.number().min(1).max(72).optional(),
});

const feedQuerySchema = z.object({
  lat: z.string().transform(Number).optional(),
  lng: z.string().transform(Number).optional(),
  radius: z.string().transform(Number).default('10'),
  category: z.string().optional(),
  urgency: z.string().optional(),
  status: z.string().default('OPEN'),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  sort: z.enum(['distance', 'newest', 'urgency', 'points']).default('distance'),
});

requestRouter.get('/', optionalAuth, validate(feedQuerySchema, 'query'), requestController.getFeed);
requestRouter.get('/map', optionalAuth, requestController.getMapRequests);
requestRouter.get('/my', authenticate, requestController.getMyRequests);
requestRouter.get('/:id', optionalAuth, requestController.getById);
requestRouter.post('/', authenticate, validate(createRequestSchema), requestController.create);
requestRouter.post('/:id/images', authenticate, uploadRateLimiter, requestController.uploadImage);
requestRouter.patch('/:id', authenticate, requestController.update);
requestRouter.patch('/:id/cancel', authenticate, requestController.cancel);
requestRouter.delete('/:id', authenticate, requestController.remove);
requestRouter.post('/:id/report', authenticate, requestController.report);
