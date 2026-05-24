import { Router } from 'express';
import { groupController } from '../controllers/group.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

export const groupRouter = Router();

groupRouter.get('/', optionalAuth, groupController.list);
groupRouter.get('/:id', optionalAuth, groupController.getById);
groupRouter.post('/', authenticate, groupController.create);
groupRouter.patch('/:id', authenticate, groupController.update);
groupRouter.post('/:id/join', authenticate, groupController.join);
groupRouter.post('/:id/leave', authenticate, groupController.leave);
groupRouter.get('/:id/members', optionalAuth, groupController.getMembers);
