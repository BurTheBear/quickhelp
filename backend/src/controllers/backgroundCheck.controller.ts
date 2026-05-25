import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { sterlingService, SterlingWebhookPayload } from '../services/sterling.service.js';
import { notificationService } from '../services/notification.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

// ─── Validation schemas ───────────────────────────────────────────────────────

const initiateSchema = z.object({
  firstName:   z.string().min(1).max(50).trim(),
  lastName:    z.string().min(1).max(50).trim(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD')
    .refine((d) => {
      const age = (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 18 && age <= 100;
    }, 'Must be 18 or older'),
  ssn:     z.string().min(9).max(11).optional(), // "XXX-XX-XXXX" or 9 digits
  zipCode: z.string().min(5).max(10).optional(),
  phone:   z.string().min(10).max(20).optional(),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export const backgroundCheckController = {
  /**
   * GET /background-check/status
   * Returns the current background check status for the authenticated user.
   */
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);

      const check = await prisma.backgroundCheck.findUnique({
        where: { userId: req.user.id },
        select: {
          id:              true,
          status:          true,
          initiatedAt:     true,
          completedAt:     true,
          expiresAt:       true,
          firstName:       true,
          lastName:        true,
          // never expose SSN, raw result, or order ID to the client
        },
      });

      res.json({
        success: true,
        data: check ?? { status: 'NOT_STARTED' },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /background-check/initiate
   * Submits personal info to Sterling and creates/updates the BackgroundCheck record.
   * Idempotent: calling again while PENDING/IN_PROGRESS returns the existing record.
   */
  async initiate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const userId = req.user.id;

      // Validate input
      const input = initiateSchema.parse(req.body);

      // Check for an existing non-terminal check
      const existing = await prisma.backgroundCheck.findUnique({
        where: { userId },
        select: { id: true, status: true, initiatedAt: true },
      });

      if (existing) {
        if (existing.status === 'CLEAR') {
          res.json({ success: true, data: { status: 'CLEAR', message: 'Background check already approved.' } });
          return;
        }
        if (existing.status === 'PENDING' || existing.status === 'IN_PROGRESS') {
          res.json({
            success: true,
            data: { status: existing.status, message: 'Background check already in progress.' },
          });
          return;
        }
        // CONSIDER / DISPUTE / CANCELLED / FAILED / NOT_STARTED → allow re-submission
      }

      // Get user email (required by Sterling)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (!user) throw new AppError('User not found', 404);

      // Upsert a PENDING record immediately so the user sees feedback right away
      const check = await prisma.backgroundCheck.upsert({
        where: { userId },
        create: {
          userId,
          status:      'PENDING',
          firstName:   input.firstName,
          lastName:    input.lastName,
          dateOfBirth: input.dateOfBirth,
          zipCode:     input.zipCode,
          initiatedAt: new Date(),
        },
        update: {
          status:      'PENDING',
          firstName:   input.firstName,
          lastName:    input.lastName,
          dateOfBirth: input.dateOfBirth,
          zipCode:     input.zipCode,
          initiatedAt: new Date(),
          completedAt: null as any,
          rawResult:   null as any,
        },
        select: { id: true, status: true, initiatedAt: true },
      });

      // Call Sterling asynchronously so the user gets an immediate response
      // SSN is forwarded to Sterling but never persisted in our DB
      sterlingService
        .initiateCheck({
          firstName:   input.firstName,
          lastName:    input.lastName,
          email:       user.email,
          dateOfBirth: input.dateOfBirth,
          ssn:         input.ssn,
          zipCode:     input.zipCode,
          phone:       input.phone,
        })
        .then(async (order) => {
          // Store the Sterling order ID so we can match webhooks
          await prisma.backgroundCheck.update({
            where: { userId },
            data: {
              sterlingOrderId: order.orderId,
              status:          'IN_PROGRESS',
            },
          });
          logger.info(`Background check initiated for user ${userId}, order ${order.orderId}`);
        })
        .catch(async (err) => {
          logger.error(`Sterling initiation failed for user ${userId}:`, err);
          await prisma.backgroundCheck.update({
            where: { userId },
            data: { status: 'FAILED' },
          });
        });

      res.status(201).json({
        success: true,
        data: {
          id:          check.id,
          status:      check.status,
          initiatedAt: check.initiatedAt,
          message:     'Background check submitted. You will be notified when results are ready (typically 1–3 business days).',
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /background-check/webhook  (public endpoint — verified via HMAC)
   * Called by Sterling when a check is completed.
   * Raw body must be preserved for signature verification (use express.raw middleware).
   */
  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawBody       = (req as any).rawBody as string | undefined;
      const signatureHeader = req.headers['x-sterling-signature'] as string | undefined;

      // Always ack Sterling immediately to prevent retries during processing
      res.status(200).json({ received: true });

      // Verify signature
      if (signatureHeader && rawBody !== undefined) {
        const valid = sterlingService.verifyWebhookSignature(rawBody, signatureHeader);
        if (!valid) {
          logger.warn('Sterling webhook: invalid signature — ignoring');
          return;
        }
      } else if (process.env.NODE_ENV === 'production') {
        logger.warn('Sterling webhook: missing signature or raw body — ignoring in production');
        return;
      }

      const payload = req.body as SterlingWebhookPayload;
      if (!payload?.orderId) {
        logger.warn('Sterling webhook: missing orderId in payload');
        return;
      }

      const { orderId, status: sterlingStatus } = sterlingService.parseWebhook(payload);
      logger.info(`Sterling webhook received: order ${orderId} → ${sterlingStatus}`);

      // Find the matching background check record
      const check = await prisma.backgroundCheck.findUnique({
        where: { sterlingOrderId: orderId },
        include: { user: { select: { id: true } } },
      });

      if (!check) {
        logger.warn(`Sterling webhook: no BackgroundCheck found for orderId ${orderId}`);
        return;
      }

      const now = new Date();
      const isTerminal = ['CLEAR', 'CONSIDER', 'DISPUTE', 'CANCELLED'].includes(sterlingStatus);

      await prisma.backgroundCheck.update({
        where: { id: check.id },
        data: {
          status:          sterlingStatus,
          completedAt:     isTerminal ? now : undefined,
          // CLEAR checks are valid for 1 year
          expiresAt:       sterlingStatus === 'CLEAR'
            ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
            : undefined,
          rawResult:       payload as any,
          sterlingReportId: payload.reportId ?? undefined,
        },
      });

      const userId = check.user.id;

      // Send push notification to the volunteer
      if (sterlingStatus === 'CLEAR') {
        await notificationService.create(userId, {
          type:  'BACKGROUND_CHECK_APPROVED',
          title: '✅ Background Check Approved!',
          body:  'Your background check has passed. You can now accept volunteer requests.',
          data:  { checkId: check.id },
        });
      } else if (sterlingStatus === 'CONSIDER' || sterlingStatus === 'DISPUTE') {
        await notificationService.create(userId, {
          type:  'BACKGROUND_CHECK_REJECTED',
          title: 'Background Check Update',
          body:  'Your background check requires additional review. Our team will contact you.',
          data:  { checkId: check.id },
        });
      }

      logger.info(`Background check ${check.id} updated to ${sterlingStatus} for user ${userId}`);
    } catch (err) {
      logger.error('Sterling webhook processing error:', err);
      // Don't call next(err) — we already sent 200 to Sterling
    }
  },

  /**
   * GET /background-check/admin/list  (admin only)
   * Returns paginated background checks for admin review.
   */
  async adminList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
        throw new AppError('Admin access required', 403);
      }

      const page   = parseInt(req.query.page as string) || 1;
      const limit  = 20;
      const status = req.query.status as string | undefined;

      const [checks, total] = await Promise.all([
        prisma.backgroundCheck.findMany({
          where:   status ? { status: status as any } : undefined,
          include: {
            user: {
              select: {
                id:    true,
                email: true,
                profile: { select: { displayName: true, avatarUrl: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip:    (page - 1) * limit,
          take:    limit,
        }),
        prisma.backgroundCheck.count({ where: status ? { status: status as any } : undefined }),
      ]);

      res.json({ success: true, data: checks, meta: { total, page, limit } });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /background-check/dev/simulate  (development only — blocked in production)
   * Instantly completes the authenticated user's background check with a fake result.
   * Use ?result=clear (default) or ?result=consider to test both outcomes.
   */
  async devSimulate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Hard block in production — this endpoint must NEVER run in prod
      if (process.env.NODE_ENV === 'production') {
        res.status(404).json({ success: false, error: 'Not found' });
        return;
      }

      if (!req.user) throw new AppError('Not authenticated', 401);
      const userId = req.user.id;

      const result = (req.query.result as string ?? 'clear').toLowerCase();
      if (!['clear', 'consider'].includes(result)) {
        throw new AppError('result must be "clear" or "consider"', 400);
      }

      const status = result === 'clear' ? 'CLEAR' : 'CONSIDER';
      const now    = new Date();

      // Upsert so it works even if the user never filled the form
      const check = await prisma.backgroundCheck.upsert({
        where:  { userId },
        create: {
          userId,
          status,
          firstName:   'Test',
          lastName:    'User',
          initiatedAt: now,
          completedAt: now,
          expiresAt:   status === 'CLEAR'
            ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
            : null,
          rawResult: { simulated: true, result } as any,
        },
        update: {
          status,
          completedAt: now,
          expiresAt:   status === 'CLEAR'
            ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
            : null,
          rawResult: { simulated: true, result } as any,
        },
      });

      // Fire the real notification so the push flow is tested too
      if (status === 'CLEAR') {
        await notificationService.create(userId, {
          type:  'BACKGROUND_CHECK_APPROVED',
          title: '✅ Background Check Approved! (Simulated)',
          body:  'Your simulated background check passed. You can now accept volunteer requests.',
          data:  { checkId: check.id, simulated: true },
        });
      } else {
        await notificationService.create(userId, {
          type:  'BACKGROUND_CHECK_REJECTED',
          title: 'Background Check Update (Simulated)',
          body:  'Your simulated background check requires additional review.',
          data:  { checkId: check.id, simulated: true },
        });
      }

      logger.info(`[DEV] Background check simulated for user ${userId} → ${status}`);

      res.json({
        success: true,
        data: {
          id:      check.id,
          status,
          message: `Background check simulated as ${status}. Push notification sent.`,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /background-check/admin/:userId/override  (admin only)
   * Manually approve or reject a background check (e.g. for manual review results).
   */
  async adminOverride(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
        throw new AppError('Admin access required', 403);
      }

      const schema = z.object({
        status:     z.enum(['CLEAR', 'CONSIDER', 'CANCELLED']),
        adminNotes: z.string().max(1000).optional(),
      });
      const { status, adminNotes } = schema.parse(req.body);
      const targetUserId = req.params.userId;

      const now = new Date();

      const check = await prisma.backgroundCheck.upsert({
        where: { userId: targetUserId },
        create: {
          userId:      targetUserId,
          status,
          adminNotes,
          completedAt: now,
          expiresAt:   status === 'CLEAR'
            ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
            : undefined,
        },
        update: {
          status,
          adminNotes,
          completedAt: now,
          expiresAt:   status === 'CLEAR'
            ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
            : null,
        },
      });

      // Notify user
      if (status === 'CLEAR') {
        await notificationService.create(targetUserId, {
          type:  'BACKGROUND_CHECK_APPROVED',
          title: '✅ Background Check Approved!',
          body:  'Your background check has been approved. You can now accept volunteer requests.',
          data:  { checkId: check.id },
        });
      } else if (status === 'CONSIDER') {
        await notificationService.create(targetUserId, {
          type:  'BACKGROUND_CHECK_REJECTED',
          title: 'Background Check Update',
          body:  'Your background check requires additional review. Please contact support.',
          data:  { checkId: check.id },
        });
      }

      logger.info(`Admin ${req.user.id} overrode background check for user ${targetUserId} → ${status}`);
      res.json({ success: true, data: check });
    } catch (err) {
      next(err);
    }
  },
};
