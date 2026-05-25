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
exports.adminController = void 0;
const database_js_1 = require("../config/database.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
exports.adminController = {
    async getDashboard(_req, res, next) {
        try {
            const now = new Date();
            const startOfToday = new Date(now);
            startOfToday.setHours(0, 0, 0, 0);
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - 7);
            const startOfMonth = new Date(now);
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const [totalUsers, newUsersToday, newUsersWeek, totalRequests, openRequests, completedRequests, completedToday, totalMatches, pendingReports, flaggedRequests, totalXpAwarded,] = await Promise.all([
                database_js_1.prisma.user.count({ where: { deletedAt: null } }),
                database_js_1.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
                database_js_1.prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
                database_js_1.prisma.helpRequest.count({ where: { deletedAt: null } }),
                database_js_1.prisma.helpRequest.count({ where: { status: 'OPEN' } }),
                database_js_1.prisma.helpRequest.count({ where: { status: 'COMPLETED' } }),
                database_js_1.prisma.helpRequest.count({ where: { status: 'COMPLETED', completedAt: { gte: startOfToday } } }),
                database_js_1.prisma.match.count(),
                database_js_1.prisma.report.count({ where: { status: 'PENDING' } }),
                database_js_1.prisma.helpRequest.count({ where: { isFlagged: true, deletedAt: null } }),
                database_js_1.prisma.userGamification.aggregate({ _sum: { totalXp: true } }),
            ]);
            // Request volume by day (last 30 days)
            const requestsByDay = await database_js_1.prisma.$queryRaw `
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM help_requests
        WHERE "createdAt" >= ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `;
            // Category breakdown
            const categoryBreakdown = await database_js_1.prisma.helpRequest.groupBy({
                by: ['category'],
                _count: true,
                where: { deletedAt: null },
            });
            res.json({
                success: true,
                data: {
                    users: { total: totalUsers, today: newUsersToday, thisWeek: newUsersWeek },
                    requests: { total: totalRequests, open: openRequests, completed: completedRequests, completedToday, flagged: flaggedRequests },
                    matches: { total: totalMatches },
                    moderation: { pendingReports, flaggedRequests },
                    gamification: { totalXpAwarded: totalXpAwarded._sum.totalXp ?? 0 },
                    charts: {
                        requestsByDay: requestsByDay.map((r) => ({ date: r.date, count: Number(r.count) })),
                        categoryBreakdown: categoryBreakdown.map((c) => ({ category: c.category, count: c._count })),
                    },
                },
            });
        }
        catch (err) {
            next(err);
        }
    },
    async getAnalytics(_req, res, next) {
        try {
            const [avgCompletionRate, avgRating, topCategories, topVolunteers] = await Promise.all([
                database_js_1.prisma.helpRequest.count({ where: { status: 'COMPLETED' } }).then(async (completed) => {
                    const total = await database_js_1.prisma.helpRequest.count({ where: { deletedAt: null } });
                    return total > 0 ? (completed / total) * 100 : 0;
                }),
                database_js_1.prisma.rating.aggregate({ _avg: { score: true } }),
                database_js_1.prisma.helpRequest.groupBy({
                    by: ['category'],
                    _count: true,
                    where: { status: 'COMPLETED' },
                    orderBy: { _count: { category: 'desc' } },
                    take: 5,
                }),
                database_js_1.prisma.userProfile.findMany({
                    where: { tasksCompleted: { gt: 0 } },
                    orderBy: { tasksCompleted: 'desc' },
                    take: 10,
                    select: { displayName: true, tasksCompleted: true, avgRating: true, userId: true },
                }),
            ]);
            res.json({
                success: true,
                data: {
                    avgCompletionRate: Math.round(avgCompletionRate),
                    avgRating: avgRating._avg.score ?? 0,
                    topCategories,
                    topVolunteers,
                },
            });
        }
        catch (err) {
            next(err);
        }
    },
    async listUsers(req, res, next) {
        try {
            const page = Number(req.query.page ?? 1);
            const limit = Number(req.query.limit ?? 20);
            const search = req.query.search;
            const status = req.query.status;
            const where = {
                deletedAt: null,
                ...(status ? { status: status } : {}),
                ...(search
                    ? {
                        OR: [
                            { email: { contains: search, mode: 'insensitive' } },
                            { profile: { displayName: { contains: search, mode: 'insensitive' } } },
                        ],
                    }
                    : {}),
            };
            const [users, total] = await Promise.all([
                database_js_1.prisma.user.findMany({
                    where,
                    include: {
                        profile: { select: { displayName: true, avatarUrl: true, tasksCompleted: true, avgRating: true } },
                        gamification: { select: { totalXp: true, level: true } },
                        _count: { select: { helpRequestsMade: true, matchesAsVolunteer: true, reportedBy: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                database_js_1.prisma.user.count({ where }),
            ]);
            res.json({ success: true, data: { users, total, page, hasMore: page * limit < total } });
        }
        catch (err) {
            next(err);
        }
    },
    async getUserDetail(req, res, next) {
        try {
            const user = await database_js_1.prisma.user.findUnique({
                where: { id: req.params.id },
                include: {
                    profile: true,
                    gamification: true,
                    streaks: true,
                    userBadges: { include: { badge: true } },
                    reportedBy: { take: 10 },
                    helpRequestsMade: { take: 5, orderBy: { createdAt: 'desc' } },
                },
            });
            if (!user)
                throw new errorHandler_js_1.AppError('User not found', 404);
            res.json({ success: true, data: user });
        }
        catch (err) {
            next(err);
        }
    },
    async updateUserStatus(req, res, next) {
        try {
            const { status } = req.body;
            const user = await database_js_1.prisma.user.update({
                where: { id: req.params.id },
                data: { status },
            });
            // Invalidate user cache
            const { cache } = await Promise.resolve().then(() => __importStar(require('../config/redis.js')));
            await cache.del(`user:${req.params.id}:role`);
            res.json({ success: true, data: user });
        }
        catch (err) {
            next(err);
        }
    },
    async updateUserRole(req, res, next) {
        try {
            const { role } = req.body;
            const user = await database_js_1.prisma.user.update({ where: { id: req.params.id }, data: { role } });
            const { cache } = await Promise.resolve().then(() => __importStar(require('../config/redis.js')));
            await cache.del(`user:${req.params.id}:role`);
            res.json({ success: true, data: user });
        }
        catch (err) {
            next(err);
        }
    },
    async deleteUser(req, res, next) {
        try {
            await database_js_1.prisma.user.update({
                where: { id: req.params.id },
                data: { deletedAt: new Date(), status: 'BANNED' },
            });
            res.json({ success: true, message: 'User deleted' });
        }
        catch (err) {
            next(err);
        }
    },
    async listRequests(req, res, next) {
        try {
            const page = Number(req.query.page ?? 1);
            const limit = Number(req.query.limit ?? 20);
            const status = req.query.status;
            const flagged = req.query.flagged === 'true';
            const [requests, total] = await Promise.all([
                database_js_1.prisma.helpRequest.findMany({
                    where: {
                        deletedAt: null,
                        ...(status ? { status: status } : {}),
                        ...(flagged ? { isFlagged: true } : {}),
                    },
                    include: {
                        author: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
                        _count: { select: { reports: true, matches: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                database_js_1.prisma.helpRequest.count({ where: { deletedAt: null } }),
            ]);
            res.json({ success: true, data: { requests, total, page } });
        }
        catch (err) {
            next(err);
        }
    },
    async flagRequest(req, res, next) {
        try {
            await database_js_1.prisma.helpRequest.update({ where: { id: req.params.id }, data: { isFlagged: true } });
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    },
    async unflagRequest(req, res, next) {
        try {
            await database_js_1.prisma.helpRequest.update({ where: { id: req.params.id }, data: { isFlagged: false } });
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    },
    async deleteRequest(req, res, next) {
        try {
            await database_js_1.prisma.helpRequest.update({
                where: { id: req.params.id },
                data: { deletedAt: new Date(), status: 'CANCELLED' },
            });
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    },
    async listReports(req, res, next) {
        try {
            const page = Number(req.query.page ?? 1);
            const limit = 20;
            const status = req.query.status ?? 'PENDING';
            const [reports, total] = await Promise.all([
                database_js_1.prisma.report.findMany({
                    where: { status: status },
                    include: {
                        author: { select: { id: true, profile: { select: { displayName: true } } } },
                        reportedUser: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
                        reportedRequest: { select: { id: true, title: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                database_js_1.prisma.report.count({ where: { status: status } }),
            ]);
            res.json({ success: true, data: { reports, total, page } });
        }
        catch (err) {
            next(err);
        }
    },
    async getReport(req, res, next) {
        try {
            const report = await database_js_1.prisma.report.findUnique({
                where: { id: req.params.id },
                include: {
                    author: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
                    reportedUser: true,
                    reportedRequest: true,
                },
            });
            if (!report)
                throw new errorHandler_js_1.AppError('Report not found', 404);
            res.json({ success: true, data: report });
        }
        catch (err) {
            next(err);
        }
    },
    async resolveReport(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            await database_js_1.prisma.report.update({
                where: { id: req.params.id },
                data: { status: 'RESOLVED', resolvedById: req.user.id, resolvedAt: new Date(), adminNotes: req.body.notes },
            });
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    },
    async dismissReport(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            await database_js_1.prisma.report.update({
                where: { id: req.params.id },
                data: { status: 'DISMISSED', resolvedById: req.user.id, resolvedAt: new Date() },
            });
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    },
    async getFlaggedContent(req, res, next) {
        try {
            const requests = await database_js_1.prisma.helpRequest.findMany({
                where: { isFlagged: true, deletedAt: null },
                include: {
                    author: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
                    _count: { select: { reports: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 50,
            });
            res.json({ success: true, data: requests });
        }
        catch (err) {
            next(err);
        }
    },
    async listBadges(_req, res, next) {
        try {
            const badges = await database_js_1.prisma.badge.findMany({ orderBy: { createdAt: 'desc' } });
            res.json({ success: true, data: badges });
        }
        catch (err) {
            next(err);
        }
    },
    async createBadge(req, res, next) {
        try {
            const badge = await database_js_1.prisma.badge.create({ data: req.body });
            res.status(201).json({ success: true, data: badge });
        }
        catch (err) {
            next(err);
        }
    },
    async updateBadge(req, res, next) {
        try {
            const badge = await database_js_1.prisma.badge.update({ where: { id: req.params.id }, data: req.body });
            res.json({ success: true, data: badge });
        }
        catch (err) {
            next(err);
        }
    },
    async listChallenges(_req, res, next) {
        try {
            const challenges = await database_js_1.prisma.challenge.findMany({ orderBy: { createdAt: 'desc' } });
            res.json({ success: true, data: challenges });
        }
        catch (err) {
            next(err);
        }
    },
    async createChallenge(req, res, next) {
        try {
            const challenge = await database_js_1.prisma.challenge.create({ data: req.body });
            res.status(201).json({ success: true, data: challenge });
        }
        catch (err) {
            next(err);
        }
    },
    async updateChallenge(req, res, next) {
        try {
            const challenge = await database_js_1.prisma.challenge.update({ where: { id: req.params.id }, data: req.body });
            res.json({ success: true, data: challenge });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=admin.controller.js.map