"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaderboardRouter = void 0;
const express_1 = require("express");
const leaderboard_controller_js_1 = require("../controllers/leaderboard.controller.js");
const auth_js_1 = require("../middleware/auth.js");
exports.leaderboardRouter = (0, express_1.Router)();
exports.leaderboardRouter.get('/global', auth_js_1.optionalAuth, leaderboard_controller_js_1.leaderboardController.getGlobal);
exports.leaderboardRouter.get('/weekly', auth_js_1.optionalAuth, leaderboard_controller_js_1.leaderboardController.getWeekly);
exports.leaderboardRouter.get('/monthly', auth_js_1.optionalAuth, leaderboard_controller_js_1.leaderboardController.getMonthly);
exports.leaderboardRouter.get('/nearby', auth_js_1.authenticate, leaderboard_controller_js_1.leaderboardController.getNearby);
exports.leaderboardRouter.get('/challenges', auth_js_1.optionalAuth, leaderboard_controller_js_1.leaderboardController.getChallenges);
//# sourceMappingURL=leaderboard.routes.js.map