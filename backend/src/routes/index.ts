import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { userRouter } from './user.routes.js';
import { requestRouter } from './request.routes.js';
import { matchRouter } from './match.routes.js';
import { chatRouter } from './chat.routes.js';
import { notificationRouter } from './notification.routes.js';
import { adminRouter } from './admin.routes.js';
import { leaderboardRouter } from './leaderboard.routes.js';
import { groupRouter } from './group.routes.js';
import socialRouter from './social.routes.js';

export const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/requests', requestRouter);
router.use('/matches', matchRouter);
router.use('/chats', chatRouter);
router.use('/notifications', notificationRouter);
router.use('/leaderboard', leaderboardRouter);
router.use('/groups', groupRouter);
router.use('/admin', adminRouter);
router.use('/social', socialRouter);
