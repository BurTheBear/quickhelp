import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';

export const notificationRouter = Router();

notificationRouter.get('/', authenticate, notificationController.getNotifications);
notificationRouter.get('/unread-count', authenticate, notificationController.getUnreadCount);
notificationRouter.patch('/:id/read', authenticate, notificationController.markRead);
notificationRouter.patch('/read-all', authenticate, notificationController.markAllRead);
notificationRouter.delete('/:id', authenticate, notificationController.remove);
