"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchController = void 0;
const match_service_js_1 = require("../services/match.service.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
exports.matchController = {
    async acceptRequest(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const match = await match_service_js_1.matchService.acceptRequest(req.params.requestId, req.user.id);
            res.status(201).json({ success: true, data: match });
        }
        catch (err) {
            next(err);
        }
    },
    async startTask(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const match = await match_service_js_1.matchService.startTask(req.params.id, req.user.id);
            res.json({ success: true, data: match });
        }
        catch (err) {
            next(err);
        }
    },
    async completeTask(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const match = await match_service_js_1.matchService.completeTask(req.params.id, req.user.id);
            res.json({ success: true, data: match });
        }
        catch (err) {
            next(err);
        }
    },
    async requestCompletion(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const match = await match_service_js_1.matchService.requestCompletion(req.params.id, req.user.id);
            res.json({ success: true, data: match });
        }
        catch (err) {
            next(err);
        }
    },
    async approveCompletion(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const match = await match_service_js_1.matchService.approveCompletion(req.params.id, req.user.id);
            res.json({ success: true, data: match });
        }
        catch (err) {
            next(err);
        }
    },
    async cancelMatch(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            await match_service_js_1.matchService.cancelMatch(req.params.id, req.user.id, req.body.reason);
            res.json({ success: true, message: 'Match cancelled' });
        }
        catch (err) {
            next(err);
        }
    },
    async getActiveMatches(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const matches = await match_service_js_1.matchService.getActiveMatches(req.user.id);
            res.json({ success: true, data: matches });
        }
        catch (err) {
            next(err);
        }
    },
    async getMatchHistory(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/database.js')));
            const matches = await prisma.match.findMany({
                where: { volunteerId: req.user.id, status: 'COMPLETED' },
                include: {
                    request: {
                        select: { id: true, title: true, category: true, completedAt: true, rewardPoints: true },
                    },
                    ratings: {
                        where: { recipientId: req.user.id },
                        select: { score: true, comment: true },
                    },
                },
                orderBy: { completedAt: 'desc' },
                take: 50,
            });
            res.json({ success: true, data: matches });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=match.controller.js.map