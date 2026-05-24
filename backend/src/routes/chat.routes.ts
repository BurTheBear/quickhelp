import { Router } from 'express';
import { chatController } from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.js';

export const chatRouter = Router();

chatRouter.get('/request/:requestId', authenticate, chatController.getConversation);
chatRouter.get('/request/:requestId/messages', authenticate, chatController.getMessages);
chatRouter.post('/request/:requestId/messages', authenticate, chatController.sendMessage);
chatRouter.patch('/messages/:messageId/read', authenticate, chatController.markRead);
chatRouter.get('/unread-count', authenticate, chatController.getUnreadCount);
