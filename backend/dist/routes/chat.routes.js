"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRouter = void 0;
const express_1 = require("express");
const chat_controller_js_1 = require("../controllers/chat.controller.js");
const auth_js_1 = require("../middleware/auth.js");
exports.chatRouter = (0, express_1.Router)();
exports.chatRouter.get('/request/:requestId', auth_js_1.authenticate, chat_controller_js_1.chatController.getConversation);
exports.chatRouter.get('/request/:requestId/messages', auth_js_1.authenticate, chat_controller_js_1.chatController.getMessages);
exports.chatRouter.post('/request/:requestId/messages', auth_js_1.authenticate, chat_controller_js_1.chatController.sendMessage);
exports.chatRouter.patch('/messages/:messageId/read', auth_js_1.authenticate, chat_controller_js_1.chatController.markRead);
exports.chatRouter.get('/unread-count', auth_js_1.authenticate, chat_controller_js_1.chatController.getUnreadCount);
//# sourceMappingURL=chat.routes.js.map