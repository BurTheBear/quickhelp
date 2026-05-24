import { Router } from 'express';
import { leaderboardController } from '../controllers/leaderboard.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

export const leaderboardRouter = Router();

leaderboardRouter.get('/global', optionalAuth, leaderboardController.getGlobal);
leaderboardRouter.get('/weekly', optionalAuth, leaderboardController.getWeekly);
leaderboardRouter.get('/monthly', optionalAuth, leaderboardController.getMonthly);
leaderboardRouter.get('/nearby', authenticate, leaderboardController.getNearby);
leaderboardRouter.get('/challenges', optionalAuth, leaderboardController.getChallenges);
