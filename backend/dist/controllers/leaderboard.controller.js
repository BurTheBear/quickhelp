"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaderboardController = void 0;
const database_js_1 = require("../config/database.js");
const redis_js_1 = require("../config/redis.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
async function getLeaderboard(field, limit = 50) {
    const cacheKey = `leaderboard:${field}`;
    const cached = await redis_js_1.cache.get(cacheKey);
    if (cached)
        return cached;
    const results = await database_js_1.prisma.userGamification.findMany({
        where: { user: { status: 'ACTIVE', profile: { isNot: null } } },
        orderBy: { [field]: 'desc' },
        take: limit,
        include: {
            user: {
                select: {
                    id: true,
                    verificationLevel: true,
                    profile: {
                        select: { displayName: true, avatarUrl: true, city: true, tasksCompleted: true },
                    },
                },
            },
        },
    });
    const ranked = results.map((r, idx) => ({
        rank: idx + 1,
        userId: r.userId,
        displayName: r.user.profile?.displayName,
        avatarUrl: r.user.profile?.avatarUrl,
        city: r.user.profile?.city,
        verificationLevel: r.user.verificationLevel,
        tasksCompleted: r.user.profile?.tasksCompleted,
        xp: r[field],
        level: r.level,
        levelName: r.levelName,
    }));
    await redis_js_1.cache.set(cacheKey, ranked, 300); // 5 min cache
    return ranked;
}
exports.leaderboardController = {
    async getGlobal(req, res, next) {
        try {
            const data = await getLeaderboard('totalXp');
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getWeekly(req, res, next) {
        try {
            const data = await getLeaderboard('weeklyXp');
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getMonthly(req, res, next) {
        try {
            const data = await getLeaderboard('monthlyXp');
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    },
    async getNearby(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const profile = await database_js_1.prisma.userProfile.findUnique({
                where: { userId: req.user.id },
                select: { city: true },
            });
            if (!profile?.city) {
                res.json({ success: true, data: [] });
                return;
            }
            const data = await database_js_1.prisma.userGamification.findMany({
                where: {
                    user: {
                        status: 'ACTIVE',
                        profile: { city: profile.city },
                    },
                },
                orderBy: { totalXp: 'desc' },
                take: 20,
                include: {
                    user: {
                        select: {
                            id: true,
                            profile: { select: { displayName: true, avatarUrl: true, city: true, tasksCompleted: true } },
                        },
                    },
                },
            });
            res.json({ success: true, data: data.map((r, i) => ({ rank: i + 1, ...r })) });
        }
        catch (err) {
            next(err);
        }
    },
    async getChallenges(_req, res, next) {
        try {
            const now = new Date();
            const challenges = await database_js_1.prisma.challenge.findMany({
                where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
                orderBy: { endDate: 'asc' },
            });
            res.json({ success: true, data: challenges });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=leaderboard.controller.js.map