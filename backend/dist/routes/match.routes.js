"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchRouter = void 0;
const express_1 = require("express");
const match_controller_js_1 = require("../controllers/match.controller.js");
const auth_js_1 = require("../middleware/auth.js");
exports.matchRouter = (0, express_1.Router)();
exports.matchRouter.post('/request/:requestId', auth_js_1.authenticate, match_controller_js_1.matchController.acceptRequest);
exports.matchRouter.patch('/:id/start', auth_js_1.authenticate, match_controller_js_1.matchController.startTask);
exports.matchRouter.patch('/:id/complete', auth_js_1.authenticate, match_controller_js_1.matchController.completeTask);
exports.matchRouter.patch('/:id/request-completion', auth_js_1.authenticate, match_controller_js_1.matchController.requestCompletion);
exports.matchRouter.patch('/:id/approve', auth_js_1.authenticate, match_controller_js_1.matchController.approveCompletion);
exports.matchRouter.patch('/:id/cancel', auth_js_1.authenticate, match_controller_js_1.matchController.cancelMatch);
exports.matchRouter.get('/active', auth_js_1.authenticate, match_controller_js_1.matchController.getActiveMatches);
exports.matchRouter.get('/history', auth_js_1.authenticate, match_controller_js_1.matchController.getMatchHistory);
//# sourceMappingURL=match.routes.js.map