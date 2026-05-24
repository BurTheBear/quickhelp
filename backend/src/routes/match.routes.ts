import { Router } from 'express';
import { matchController } from '../controllers/match.controller.js';
import { authenticate } from '../middleware/auth.js';

export const matchRouter = Router();

matchRouter.post('/request/:requestId', authenticate, matchController.acceptRequest);
matchRouter.patch('/:id/start', authenticate, matchController.startTask);
matchRouter.patch('/:id/complete', authenticate, matchController.completeTask);
matchRouter.patch('/:id/request-completion', authenticate, matchController.requestCompletion);
matchRouter.patch('/:id/approve', authenticate, matchController.approveCompletion);
matchRouter.patch('/:id/cancel', authenticate, matchController.cancelMatch);
matchRouter.get('/active', authenticate, matchController.getActiveMatches);
matchRouter.get('/history', authenticate, matchController.getMatchHistory);
