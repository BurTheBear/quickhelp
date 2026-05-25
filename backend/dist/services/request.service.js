"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestService = void 0;
const client_1 = require("@prisma/client");
const database_js_1 = require("../config/database.js");
const redis_js_1 = require("../config/redis.js");
const ai_service_js_1 = require("./ai.service.js");
const notification_service_js_1 = require("./notification.service.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const EARTH_RADIUS_KM = 6371;
// Haversine formula for distance calculation in SQL
function haversineSQL(lat, lng) {
    return client_1.Prisma.sql `
    (${EARTH_RADIUS_KM} * acos(
      LEAST(1.0, cos(radians(${lat}))
        * cos(radians(latitude))
        * cos(radians(longitude) - radians(${lng}))
        + sin(radians(${lat}))
        * sin(radians(latitude))
      )
    ))
  `;
}
exports.requestService = {
    async getFeed(userId, query) {
        const { lat, lng, radius = 10, category, urgency, status = 'OPEN', page = 1, limit = 20, sort = 'distance', } = query;
        const skip = (page - 1) * limit;
        const where = {
            status: status,
            deletedAt: null,
            isFlagged: false,
            ...(category ? { category: category } : {}),
            ...(urgency ? { urgency: urgency } : {}),
            // Show all requests including own (so solo testing works)
        };
        // If location provided, filter by radius using raw query
        let requests;
        let total;
        if (lat !== undefined && lng !== undefined) {
            const radiusFilter = client_1.Prisma.sql `
        AND (${haversineSQL(lat, lng)}) <= ${radius}
      `;
            const categoryFilter = category
                ? client_1.Prisma.sql `AND category = ${category}::"RequestCategory"`
                : client_1.Prisma.sql ``;
            const urgencyFilter = urgency
                ? client_1.Prisma.sql `AND urgency = ${urgency}::"UrgencyLevel"`
                : client_1.Prisma.sql ``;
            const userFilter = client_1.Prisma.sql ``;
            const orderBy = sort === 'distance'
                ? client_1.Prisma.sql `ORDER BY distance ASC`
                : sort === 'urgency'
                    ? client_1.Prisma.sql `ORDER BY CASE urgency WHEN 'EMERGENCY' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END ASC`
                    : sort === 'points'
                        ? client_1.Prisma.sql `ORDER BY "rewardPoints" DESC`
                        : client_1.Prisma.sql `ORDER BY "createdAt" DESC`;
            requests = await database_js_1.prisma.$queryRaw `
        SELECT id, ${haversineSQL(lat, lng)} as distance
        FROM help_requests
        WHERE status = ${status}::"RequestStatus"
          AND "deletedAt" IS NULL
          AND "isFlagged" = false
          ${radiusFilter}
          ${categoryFilter}
          ${urgencyFilter}
          ${userFilter}
        ${orderBy}
        LIMIT ${limit} OFFSET ${skip}
      `;
            const ids = requests.map((r) => r.id);
            const distanceMap = new Map(requests.map((r) => [r.id, r.distance]));
            const fullRequests = await database_js_1.prisma.helpRequest.findMany({
                where: { id: { in: ids } },
                include: requestIncludes,
            });
            // Re-attach distance and re-sort to match raw query order
            const result = ids.map((id) => {
                const req = fullRequests.find((r) => r.id === id);
                return { ...req, distance: Math.round(distanceMap.get(id) * 10) / 10 };
            });
            const countResult = await database_js_1.prisma.$queryRaw `
        SELECT COUNT(*) as count
        FROM help_requests
        WHERE status = ${status}::"RequestStatus"
          AND "deletedAt" IS NULL
          AND "isFlagged" = false
          ${radiusFilter}
          ${categoryFilter}
          ${urgencyFilter}
          ${userFilter}
      `;
            total = Number(countResult[0].count);
            return { requests: result, total, page, limit, hasMore: skip + limit < total };
        }
        else {
            // No location — standard Prisma query
            const orderByMap = {
                newest: { createdAt: 'desc' },
                urgency: { urgency: 'asc' },
                points: { rewardPoints: 'desc' },
                distance: { createdAt: 'desc' }, // fallback when no location
            };
            [requests, total] = await Promise.all([
                database_js_1.prisma.helpRequest.findMany({
                    where,
                    include: requestIncludes,
                    orderBy: orderByMap[sort],
                    skip,
                    take: limit,
                }),
                database_js_1.prisma.helpRequest.count({ where }),
            ]);
            return {
                requests: requests.map((r) => ({ ...r, distance: null })),
                total,
                page,
                limit,
                hasMore: skip + limit < total,
            };
        }
    },
    async getById(id, viewerId) {
        const request = await database_js_1.prisma.helpRequest.findFirst({
            where: { id, deletedAt: null },
            include: {
                ...requestIncludes,
                matches: {
                    where: { status: { in: ['ACCEPTED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED'] } },
                    include: {
                        volunteer: {
                            select: {
                                id: true,
                                profile: { select: { displayName: true, avatarUrl: true, avgRating: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!request)
            throw new errorHandler_js_1.AppError('Request not found', 404);
        // Increment view count async — don't await
        database_js_1.prisma.helpRequest.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => { });
        return request;
    },
    async getMapRequests(bounds) {
        const cacheKey = `map:${bounds.north.toFixed(2)}:${bounds.south.toFixed(2)}:${bounds.east.toFixed(2)}:${bounds.west.toFixed(2)}`;
        const cached = await redis_js_1.cache.get(cacheKey);
        if (cached)
            return cached;
        const requests = await database_js_1.prisma.helpRequest.findMany({
            where: {
                status: 'OPEN',
                deletedAt: null,
                isFlagged: false,
                latitude: { gte: bounds.south, lte: bounds.north },
                longitude: { gte: bounds.west, lte: bounds.east },
            },
            select: {
                id: true,
                title: true,
                category: true,
                urgency: true,
                latitude: true,
                longitude: true,
                rewardPoints: true,
                estimatedMinutes: true,
                createdAt: true,
            },
            take: 200,
            orderBy: { urgency: 'asc' },
        });
        await redis_js_1.cache.set(cacheKey, requests, 30); // 30 second cache for map
        return requests;
    },
    async create(authorId, input) {
        // AI safety check
        let safetyScore = 1.0;
        let aiCategory = null;
        try {
            const aiResult = await ai_service_js_1.aiService.moderateAndCategorize(input.title, input.description);
            safetyScore = aiResult.safetyScore;
            aiCategory = aiResult.category;
            if (safetyScore < 0.3) {
                throw new errorHandler_js_1.AppError('Request flagged for inappropriate content', 422);
            }
        }
        catch (err) {
            if (err instanceof errorHandler_js_1.AppError)
                throw err;
            // AI failure is non-blocking — log and continue
        }
        // Calculate reward points based on urgency + estimated time
        const basePoints = Math.floor(input.estimatedMinutes * 1.5);
        const urgencyMultiplier = { LOW: 1, MEDIUM: 1.5, HIGH: 2, EMERGENCY: 3 }[input.urgency];
        const rewardPoints = Math.round(basePoints * urgencyMultiplier);
        const expiresAt = input.expiresInHours
            ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000)
            : null;
        const request = await database_js_1.prisma.helpRequest.create({
            data: {
                authorId,
                title: input.title,
                description: input.description,
                category: input.category,
                urgency: input.urgency,
                estimatedMinutes: input.estimatedMinutes,
                latitude: input.latitude,
                longitude: input.longitude,
                address: input.address,
                locationNotes: input.locationNotes,
                requiredSkills: input.requiredSkills ?? [],
                rewardPoints,
                expiresAt,
                aiSafetyScore: safetyScore,
                aiCategory,
                isFlagged: safetyScore < 0.6,
                conversation: { create: {} }, // create chat room immediately
            },
            include: requestIncludes,
        });
        await database_js_1.prisma.userProfile.update({
            where: { userId: authorId },
            data: { tasksRequested: { increment: 1 } },
        });
        // Notify nearby volunteers (async)
        notification_service_js_1.notificationService.notifyNearbyVolunteers(request).catch(() => { });
        return request;
    },
    async cancel(requestId, userId) {
        const request = await database_js_1.prisma.helpRequest.findFirst({
            where: { id: requestId, authorId: userId, deletedAt: null },
        });
        if (!request)
            throw new errorHandler_js_1.AppError('Request not found', 404);
        if (!['OPEN', 'MATCHED'].includes(request.status)) {
            throw new errorHandler_js_1.AppError('Cannot cancel a request that is in progress or completed', 400);
        }
        return database_js_1.prisma.helpRequest.update({
            where: { id: requestId },
            data: { status: 'CANCELLED' },
        });
    },
    async getMyRequests(userId, type = 'made') {
        if (type === 'made') {
            return database_js_1.prisma.helpRequest.findMany({
                where: { authorId: userId, deletedAt: null },
                include: requestIncludes,
                orderBy: { createdAt: 'desc' },
                take: 50,
            });
        }
        const matches = await database_js_1.prisma.match.findMany({
            where: { volunteerId: userId },
            include: {
                request: {
                    include: requestIncludes,
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return matches.map((m) => ({ ...m.request, matchStatus: m.status }));
    },
};
const requestIncludes = {
    author: {
        select: {
            id: true,
            verificationLevel: true,
            profile: {
                select: {
                    displayName: true,
                    avatarUrl: true,
                    avgRating: true,
                    totalRatings: true,
                    tasksCompleted: true,
                },
            },
            gamification: {
                select: { level: true, levelName: true },
            },
        },
    },
    images: {
        select: { id: true, url: true, thumbnailUrl: true, order: true },
        orderBy: { order: 'asc' },
    },
    _count: {
        select: { matches: true },
    },
};
//# sourceMappingURL=request.service.js.map