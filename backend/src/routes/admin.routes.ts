import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const adminRouter = Router();

// All admin routes require ADMIN or SUPER_ADMIN role
adminRouter.use(authenticate, requireRole('ADMIN', 'SUPER_ADMIN'));

// Dashboard metrics
adminRouter.get('/dashboard', adminController.getDashboard);
adminRouter.get('/analytics', adminController.getAnalytics);

// User management
adminRouter.get('/users', adminController.listUsers);
adminRouter.get('/users/:id', adminController.getUserDetail);
adminRouter.patch('/users/:id/status', adminController.updateUserStatus);
adminRouter.patch('/users/:id/role', requireRole('SUPER_ADMIN'), adminController.updateUserRole);
adminRouter.delete('/users/:id', requireRole('SUPER_ADMIN'), adminController.deleteUser);

// Request moderation
adminRouter.get('/requests', adminController.listRequests);
adminRouter.patch('/requests/:id/flag', adminController.flagRequest);
adminRouter.patch('/requests/:id/unflag', adminController.unflagRequest);
adminRouter.delete('/requests/:id', adminController.deleteRequest);

// Reports management
adminRouter.get('/reports', adminController.listReports);
adminRouter.get('/reports/:id', adminController.getReport);
adminRouter.patch('/reports/:id/resolve', adminController.resolveReport);
adminRouter.patch('/reports/:id/dismiss', adminController.dismissReport);

// Content moderation
adminRouter.get('/flagged', adminController.getFlaggedContent);

// Badges & Achievements management
adminRouter.get('/badges', adminController.listBadges);
adminRouter.post('/badges', adminController.createBadge);
adminRouter.patch('/badges/:id', adminController.updateBadge);

// Challenges
adminRouter.get('/challenges', adminController.listChallenges);
adminRouter.post('/challenges', adminController.createChallenge);
adminRouter.patch('/challenges/:id', adminController.updateChallenge);
