import { prisma } from '../config/database.js';
import { gamificationService } from './gamification.service.js';
import { notificationService } from './notification.service.js';
import { AppError } from '../middleware/errorHandler.js';

export const matchService = {
  async acceptRequest(requestId: string, volunteerId: string) {
    // ── Background check gate ─────────────────────────────────────────────────
    // A volunteer must have a cleared (CLEAR) background check before they can
    // accept any help request. Expired checks (expiresAt < now) are also blocked.
    const bgCheck = await prisma.backgroundCheck.findUnique({
      where:  { userId: volunteerId },
      select: { status: true, expiresAt: true },
    });

    const isCleared =
      bgCheck?.status === 'CLEAR' &&
      (bgCheck.expiresAt === null || bgCheck.expiresAt > new Date());

    if (!isCleared) {
      const statusMsg = !bgCheck
        ? 'not_started'
        : bgCheck.status === 'CLEAR' && bgCheck.expiresAt && bgCheck.expiresAt <= new Date()
          ? 'expired'
          : bgCheck.status.toLowerCase();

      throw new AppError(
        'A cleared background check is required to volunteer.',
        403,
        true,
        { requiresBackgroundCheck: true, checkStatus: statusMsg }
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Verify request is still open
    const request = await prisma.helpRequest.findFirst({
      where: { id: requestId, status: 'OPEN', deletedAt: null },
      include: { author: { select: { id: true, profile: { select: { displayName: true } } } } },
    });

    if (!request) throw new AppError('Request not available', 404);
    if (request.authorId === volunteerId) throw new AppError('Cannot volunteer for your own request', 400);

    // Check if already matched by this volunteer
    const existingMatch = await prisma.match.findUnique({
      where: { requestId_volunteerId: { requestId, volunteerId } },
    });
    if (existingMatch) throw new AppError('Already matched with this request', 409);

    // Check volunteer has no conflicting active tasks
    const activeMatch = await prisma.match.findFirst({
      where: { volunteerId, status: { in: ['ACCEPTED', 'IN_PROGRESS'] } },
    });
    if (activeMatch) throw new AppError('You already have an active task in progress', 409);

    // Create match and update request status atomically
    const [match] = await prisma.$transaction([
      prisma.match.create({
        data: {
          requestId,
          volunteerId,
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
        include: {
          volunteer: {
            select: {
              id: true,
              profile: { select: { displayName: true, avatarUrl: true, avgRating: true } },
              gamification: { select: { level: true } },
            },
          },
        },
      }),
      prisma.helpRequest.update({
        where: { id: requestId },
        data: { status: 'MATCHED' },
      }),
    ]);

    // Notify the requester
    const volunteerName = match.volunteer.profile?.displayName ?? 'A volunteer';
    await notificationService.create(request.authorId, {
      type: 'VOLUNTEER_ACCEPTED',
      title: 'A volunteer is on their way!',
      body: `${volunteerName} accepted your request and is heading to help you.`,
      data: { requestId, matchId: match.id, volunteerId },
    });

    return match;
  },

  async startTask(matchId: string, volunteerId: string) {
    const match = await prisma.match.findFirst({
      where: { id: matchId, volunteerId, status: 'ACCEPTED' },
      include: { request: { select: { authorId: true, title: true } } },
    });

    if (!match) throw new AppError('Match not found', 404);

    const updated = await prisma.$transaction([
      prisma.match.update({
        where: { id: matchId },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      }),
      prisma.helpRequest.update({
        where: { id: match.requestId },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      }),
    ]);

    await notificationService.create(match.request.authorId, {
      type: 'TASK_STARTED',
      title: 'Your helper has arrived!',
      body: `Your volunteer has started helping with "${match.request.title}".`,
      data: { requestId: match.requestId, matchId },
    });

    return updated[0];
  },

  async completeTask(matchId: string, volunteerId: string) {
    const match = await prisma.match.findFirst({
      where: { id: matchId, volunteerId, status: 'IN_PROGRESS' },
      include: {
        request: {
          select: { authorId: true, title: true, category: true, rewardPoints: true, estimatedMinutes: true },
        },
        volunteer: {
          select: { profile: { select: { displayName: true } } },
        },
      },
    });

    if (!match) throw new AppError('Match not found', 404);

    const now = new Date();
    const [updatedMatch] = await prisma.$transaction([
      prisma.match.update({
        where: { id: matchId },
        data: { status: 'COMPLETED', completedAt: now },
      }),
      prisma.helpRequest.update({
        where: { id: match.requestId },
        data: { status: 'COMPLETED', completedAt: now },
      }),
      prisma.userProfile.update({
        where: { userId: volunteerId },
        data: { tasksCompleted: { increment: 1 } },
      }),
    ]);

    // Award XP to volunteer
    // xp bonus placeholder
    await gamificationService.awardXP(
      volunteerId,
      match.request.rewardPoints,
      `Completed: ${match.request.title}`,
      matchId
    );

    // Update streak
    await gamificationService.updateStreak(volunteerId);

    // Update challenge progress
    await gamificationService.updateChallengeProgress(volunteerId, match.request.category);

    // Notify requester to rate
    const volunteerName = match.volunteer.profile?.displayName ?? 'Your volunteer';
    await notificationService.create(match.request.authorId, {
      type: 'TASK_COMPLETED',
      title: 'Task completed! 🎉',
      body: `${volunteerName} completed your request. Please rate your experience.`,
      data: { requestId: match.requestId, matchId, volunteerId },
    });

    return updatedMatch;
  },

  async requestCompletion(matchId: string, volunteerId: string) {
    const match = await prisma.match.findFirst({
      where: { id: matchId, volunteerId, status: { in: ['ACCEPTED', 'IN_PROGRESS'] } },
      include: {
        request: { select: { authorId: true, id: true } },
        volunteer: { select: { profile: { select: { displayName: true } } } },
      },
    });

    if (!match) throw new AppError('Match not found', 404);

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: { status: 'PENDING_APPROVAL' },
    });

    const volunteerName = match.volunteer.profile?.displayName ?? 'Your volunteer';
    await notificationService.create(match.request.authorId, {
      type: 'TASK_COMPLETED',
      title: 'Completion Requested',
      body: `${volunteerName} says they've finished your request. Tap to approve.`,
      data: { requestId: match.request.id, matchId },
    });

    return updatedMatch;
  },

  async approveCompletion(matchId: string, requesterId: string) {
    const match = await prisma.match.findFirst({
      where: { id: matchId, status: 'PENDING_APPROVAL' },
      include: {
        request: { select: { authorId: true, title: true, category: true, rewardPoints: true, id: true } },
        volunteer: { select: { id: true, profile: true } },
      },
    });

    if (!match) throw new AppError('Match not found', 404);
    if (match.request.authorId !== requesterId) throw new AppError('Not authorized', 403);

    const now = new Date();
    const volunteerId = match.volunteerId;

    const [updatedMatch] = await prisma.$transaction([
      prisma.match.update({
        where: { id: matchId },
        data: { status: 'COMPLETED', completedAt: now },
      }),
      prisma.helpRequest.update({
        where: { id: match.requestId },
        data: { status: 'COMPLETED', completedAt: now },
      }),
      prisma.userProfile.update({
        where: { userId: volunteerId },
        data: { tasksCompleted: { increment: 1 } },
      }),
    ]);

    await gamificationService.awardXP(
      volunteerId,
      match.request.rewardPoints,
      `Completed: ${match.request.title}`,
      matchId
    );

    await gamificationService.updateStreak(volunteerId);
    await gamificationService.updateChallengeProgress(volunteerId, match.request.category);

    await notificationService.create(volunteerId, {
      type: 'TASK_COMPLETED',
      title: 'Task Approved! 🎉',
      body: 'Your help was approved. XP has been awarded!',
      data: { requestId: match.request.id, matchId },
    });

    return updatedMatch;
  },

  async cancelMatch(matchId: string, userId: string, reason?: string) {
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        status: { in: ['ACCEPTED', 'IN_PROGRESS'] },
        OR: [{ volunteerId: userId }, { request: { authorId: userId } }],
      },
      include: { request: { select: { authorId: true, title: true } } },
    });

    if (!match) throw new AppError('Match not found', 404);

    await prisma.$transaction([
      prisma.match.update({
        where: { id: matchId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
      }),
      prisma.helpRequest.update({
        where: { id: match.requestId },
        data: { status: 'OPEN' }, // Re-open for other volunteers
      }),
    ]);

    const notifyUserId = userId === match.volunteerId ? match.request.authorId : match.volunteerId;
    await notificationService.create(notifyUserId, {
      type: 'TASK_STARTED', // Reuse type, customize message
      title: 'Task match cancelled',
      body: `The match for "${match.request.title}" was cancelled. ${reason ? `Reason: ${reason}` : ''}`,
      data: { requestId: match.requestId },
    });
  },

  async getActiveMatches(userId: string) {
    return prisma.match.findMany({
      where: {
        volunteerId: userId,
        status: { in: ['ACCEPTED', 'IN_PROGRESS'] },
      },
      include: {
        request: {
          include: {
            author: {
              select: { profile: { select: { displayName: true, avatarUrl: true } } },
            },
            images: { select: { url: true, thumbnailUrl: true }, take: 1 },
          },
        },
      },
    });
  },
};
