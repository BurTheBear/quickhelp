import { Prisma, RequestCategory, RequestStatus, UrgencyLevel } from '@prisma/client';
import { prisma } from '../config/database.js';
import { cache } from '../config/redis.js';
import { aiService } from './ai.service.js';
import { notificationService } from './notification.service.js';
import { AppError } from '../middleware/errorHandler.js';

const EARTH_RADIUS_KM = 6371;

// Haversine formula for distance calculation in SQL
function haversineSQL(lat: number, lng: number): Prisma.Sql {
  return Prisma.sql`
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

export interface FeedQuery {
  lat?: number;
  lng?: number;
  radius?: number;
  category?: string;
  urgency?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort?: 'distance' | 'newest' | 'urgency' | 'points';
}

export const requestService = {
  async getFeed(userId: string | undefined, query: FeedQuery) {
    const {
      lat,
      lng,
      radius = 10,
      category,
      urgency,
      status = 'OPEN',
      page = 1,
      limit = 20,
      sort = 'distance',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.HelpRequestWhereInput = {
      status: status as RequestStatus,
      deletedAt: null,
      isFlagged: false,
      ...(category ? { category: category as RequestCategory } : {}),
      ...(urgency ? { urgency: urgency as UrgencyLevel } : {}),
      // Show all requests including own (so solo testing works)
    };

    // If location provided, filter by radius using raw query
    let requests;
    let total: number;

    if (lat !== undefined && lng !== undefined) {
      const radiusFilter = Prisma.sql`
        AND (${haversineSQL(lat, lng)}) <= ${radius}
      `;

      const categoryFilter = category
        ? Prisma.sql`AND category = ${category}::"RequestCategory"`
        : Prisma.sql``;
      const urgencyFilter = urgency
        ? Prisma.sql`AND urgency = ${urgency}::"UrgencyLevel"`
        : Prisma.sql``;
      const userFilter = Prisma.sql``;

      const orderBy =
        sort === 'distance'
          ? Prisma.sql`ORDER BY distance ASC`
          : sort === 'urgency'
          ? Prisma.sql`ORDER BY CASE urgency WHEN 'EMERGENCY' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END ASC`
          : sort === 'points'
          ? Prisma.sql`ORDER BY "rewardPoints" DESC`
          : Prisma.sql`ORDER BY "createdAt" DESC`;

      requests = await prisma.$queryRaw<Array<{ id: string; distance: number }>>`
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

      const fullRequests = await prisma.helpRequest.findMany({
        where: { id: { in: ids } },
        include: requestIncludes,
      });

      // Re-attach distance and re-sort to match raw query order
      const result = ids.map((id) => {
        const req = fullRequests.find((r) => r.id === id)!;
        return { ...req, distance: Math.round(distanceMap.get(id)! * 10) / 10 };
      });

      const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
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
    } else {
      // No location — standard Prisma query
      const orderByMap: Record<string, Prisma.HelpRequestOrderByWithRelationInput> = {
        newest: { createdAt: 'desc' },
        urgency: { urgency: 'asc' },
        points: { rewardPoints: 'desc' },
        distance: { createdAt: 'desc' }, // fallback when no location
      };

      [requests, total] = await Promise.all([
        prisma.helpRequest.findMany({
          where,
          include: requestIncludes,
          orderBy: orderByMap[sort],
          skip,
          take: limit,
        }),
        prisma.helpRequest.count({ where }),
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

  async getById(id: string, viewerId?: string) {
    const request = await prisma.helpRequest.findFirst({
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

    if (!request) throw new AppError('Request not found', 404);

    // Increment view count async — don't await
    prisma.helpRequest.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    return request;
  },

  async getMapRequests(bounds: { north: number; south: number; east: number; west: number }) {
    const cacheKey = `map:${bounds.north.toFixed(2)}:${bounds.south.toFixed(2)}:${bounds.east.toFixed(2)}:${bounds.west.toFixed(2)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const requests = await prisma.helpRequest.findMany({
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

    await cache.set(cacheKey, requests, 30); // 30 second cache for map
    return requests;
  },

  async create(
    authorId: string,
    input: {
      title: string;
      description: string;
      category: RequestCategory;
      urgency: UrgencyLevel;
      estimatedMinutes: number;
      latitude: number;
      longitude: number;
      address?: string;
      locationNotes?: string;
      requiredSkills?: string[];
      expiresInHours?: number;
    }
  ) {
    // AI safety check
    let safetyScore = 1.0;
    let aiCategory: string | null = null;
    try {
      const aiResult = await aiService.moderateAndCategorize(input.title, input.description);
      safetyScore = aiResult.safetyScore;
      aiCategory = aiResult.category;

      if (safetyScore < 0.3) {
        throw new AppError('Request flagged for inappropriate content', 422);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      // AI failure is non-blocking — log and continue
    }

    // Calculate reward points based on urgency + estimated time
    const basePoints = Math.floor(input.estimatedMinutes * 1.5);
    const urgencyMultiplier = { LOW: 1, MEDIUM: 1.5, HIGH: 2, EMERGENCY: 3 }[input.urgency];
    const rewardPoints = Math.round(basePoints * urgencyMultiplier);

    const expiresAt = input.expiresInHours
      ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000)
      : null;

    const request = await prisma.helpRequest.create({
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

    await prisma.userProfile.update({
      where: { userId: authorId },
      data: { tasksRequested: { increment: 1 } },
    });

    // Notify nearby volunteers (async)
    notificationService.notifyNearbyVolunteers(request).catch(() => {});

    return request;
  },

  async cancel(requestId: string, userId: string) {
    const request = await prisma.helpRequest.findFirst({
      where: { id: requestId, authorId: userId, deletedAt: null },
    });

    if (!request) throw new AppError('Request not found', 404);
    if (!['OPEN', 'MATCHED'].includes(request.status)) {
      throw new AppError('Cannot cancel a request that is in progress or completed', 400);
    }

    return prisma.helpRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });
  },

  async getMyRequests(userId: string, type: 'made' | 'volunteered' = 'made') {
    if (type === 'made') {
      return prisma.helpRequest.findMany({
        where: { authorId: userId, deletedAt: null },
        include: requestIncludes,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    const matches = await prisma.match.findMany({
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
    orderBy: { order: 'asc' } as const,
  },
  _count: {
    select: { matches: true },
  },
} satisfies Prisma.HelpRequestInclude;
