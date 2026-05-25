"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backgroundCheckController = void 0;
const zod_1 = require("zod");
const database_js_1 = require("../config/database.js");
const sterling_service_js_1 = require("../services/sterling.service.js");
const notification_service_js_1 = require("../services/notification.service.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
const logger_js_1 = require("../utils/logger.js");
// ─── Validation schemas ───────────────────────────────────────────────────────
const initiateSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(50).trim(),
    lastName: zod_1.z.string().min(1).max(50).trim(),
    dateOfBirth: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD')
        .refine((d) => {
        const age = (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return age >= 18 && age <= 100;
    }, 'Must be 18 or older'),
    ssn: zod_1.z.string().min(9).max(11).optional(), // "XXX-XX-XXXX" or 9 digits
    zipCode: zod_1.z.string().min(5).max(10).optional(),
    phone: zod_1.z.string().min(10).max(20).optional(),
});
// ─── Controller ───────────────────────────────────────────────────────────────
exports.backgroundCheckController = {
    /**
     * GET /background-check/status
     * Returns the current background check status for the authenticated user.
     */
    async getStatus(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const check = await database_js_1.prisma.backgroundCheck.findUnique({
                where: { userId: req.user.id },
                select: {
                    id: true,
                    status: true,
                    initiatedAt: true,
                    completedAt: true,
                    expiresAt: true,
                    firstName: true,
                    lastName: true,
                    // never expose SSN, raw result, or order ID to the client
                },
            });
            res.json({
                success: true,
                data: check ?? { status: 'NOT_STARTED' },
            });
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * POST /background-check/initiate
     * Submits personal info to Sterling and creates/updates the BackgroundCheck record.
     * Idempotent: calling again while PENDING/IN_PROGRESS returns the existing record.
     */
    async initiate(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const userId = req.user.id;
            // Validate input
            const input = initiateSchema.parse(req.body);
            // Check for an existing non-terminal check
            const existing = await database_js_1.prisma.backgroundCheck.findUnique({
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
            const user = await database_js_1.prisma.user.findUnique({
                where: { id: userId },
                select: { email: true },
            });
            if (!user)
                throw new errorHandler_js_1.AppError('User not found', 404);
            // Upsert a PENDING record immediately so the user sees feedback right away
            const check = await database_js_1.prisma.backgroundCheck.upsert({
                where: { userId },
                create: {
                    userId,
                    status: 'PENDING',
                    firstName: input.firstName,
                    lastName: input.lastName,
                    dateOfBirth: input.dateOfBirth,
                    zipCode: input.zipCode,
                    initiatedAt: new Date(),
                },
                update: {
                    status: 'PENDING',
                    firstName: input.firstName,
                    lastName: input.lastName,
                    dateOfBirth: input.dateOfBirth,
                    zipCode: input.zipCode,
                    initiatedAt: new Date(),
                    completedAt: null,
                    rawResult: null,
                },
                select: { id: true, status: true, initiatedAt: true },
            });
            // Call Sterling asynchronously so the user gets an immediate response
            // SSN is forwarded to Sterling but never persisted in our DB
            sterling_service_js_1.sterlingService
                .initiateCheck({
                firstName: input.firstName,
                lastName: input.lastName,
                email: user.email,
                dateOfBirth: input.dateOfBirth,
                ssn: input.ssn,
                zipCode: input.zipCode,
                phone: input.phone,
            })
                .then(async (order) => {
                // Store the Sterling order ID so we can match webhooks
                await database_js_1.prisma.backgroundCheck.update({
                    where: { userId },
                    data: {
                        sterlingOrderId: order.orderId,
                        status: 'IN_PROGRESS',
                    },
                });
                logger_js_1.logger.info(`Background check initiated for user ${userId}, order ${order.orderId}`);
            })
                .catch(async (err) => {
                logger_js_1.logger.error(`Sterling initiation failed for user ${userId}:`, err);
                await database_js_1.prisma.backgroundCheck.update({
                    where: { userId },
                    data: { status: 'FAILED' },
                });
            });
            res.status(201).json({
                success: true,
                data: {
                    id: check.id,
                    status: check.status,
                    initiatedAt: check.initiatedAt,
                    message: 'Background check submitted. You will be notified when results are ready (typically 1–3 business days).',
                },
            });
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * POST /background-check/webhook  (public endpoint — verified via HMAC)
     * Called by Sterling when a check is completed.
     * Raw body must be preserved for signature verification (use express.raw middleware).
     */
    async webhook(req, res, next) {
        try {
            const rawBody = req.rawBody;
            const signatureHeader = req.headers['x-sterling-signature'];
            // Always ack Sterling immediately to prevent retries during processing
            res.status(200).json({ received: true });
            // Verify signature
            if (signatureHeader && rawBody !== undefined) {
                const valid = sterling_service_js_1.sterlingService.verifyWebhookSignature(rawBody, signatureHeader);
                if (!valid) {
                    logger_js_1.logger.warn('Sterling webhook: invalid signature — ignoring');
                    return;
                }
            }
            else if (process.env.NODE_ENV === 'production') {
                logger_js_1.logger.warn('Sterling webhook: missing signature or raw body — ignoring in production');
                return;
            }
            const payload = req.body;
            if (!payload?.orderId) {
                logger_js_1.logger.warn('Sterling webhook: missing orderId in payload');
                return;
            }
            const { orderId, status: sterlingStatus } = sterling_service_js_1.sterlingService.parseWebhook(payload);
            logger_js_1.logger.info(`Sterling webhook received: order ${orderId} → ${sterlingStatus}`);
            // Find the matching background check record
            const check = await database_js_1.prisma.backgroundCheck.findUnique({
                where: { sterlingOrderId: orderId },
                include: { user: { select: { id: true } } },
            });
            if (!check) {
                logger_js_1.logger.warn(`Sterling webhook: no BackgroundCheck found for orderId ${orderId}`);
                return;
            }
            const now = new Date();
            const isTerminal = ['CLEAR', 'CONSIDER', 'DISPUTE', 'CANCELLED'].includes(sterlingStatus);
            await database_js_1.prisma.backgroundCheck.update({
                where: { id: check.id },
                data: {
                    status: sterlingStatus,
                    completedAt: isTerminal ? now : undefined,
                    // CLEAR checks are valid for 1 year
                    expiresAt: sterlingStatus === 'CLEAR'
                        ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
                        : undefined,
                    rawResult: payload,
                    sterlingReportId: payload.reportId ?? undefined,
                },
            });
            const userId = check.user.id;
            // Send push notification to the volunteer
            if (sterlingStatus === 'CLEAR') {
                await notification_service_js_1.notificationService.create(userId, {
                    type: 'BACKGROUND_CHECK_APPROVED',
                    title: '✅ Background Check Approved!',
                    body: 'Your background check has passed. You can now accept volunteer requests.',
                    data: { checkId: check.id },
                });
            }
            else if (sterlingStatus === 'CONSIDER' || sterlingStatus === 'DISPUTE') {
                await notification_service_js_1.notificationService.create(userId, {
                    type: 'BACKGROUND_CHECK_REJECTED',
                    title: 'Background Check Update',
                    body: 'Your background check requires additional review. Our team will contact you.',
                    data: { checkId: check.id },
                });
            }
            logger_js_1.logger.info(`Background check ${check.id} updated to ${sterlingStatus} for user ${userId}`);
        }
        catch (err) {
            logger_js_1.logger.error('Sterling webhook processing error:', err);
            // Don't call next(err) — we already sent 200 to Sterling
        }
    },
    /**
     * GET /background-check/admin/list  (admin only)
     * Returns paginated background checks for admin review.
     */
    async adminList(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
                throw new errorHandler_js_1.AppError('Admin access required', 403);
            }
            const page = parseInt(req.query.page) || 1;
            const limit = 20;
            const status = req.query.status;
            const [checks, total] = await Promise.all([
                database_js_1.prisma.backgroundCheck.findMany({
                    where: status ? { status: status } : undefined,
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                profile: { select: { displayName: true, avatarUrl: true } },
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                database_js_1.prisma.backgroundCheck.count({ where: status ? { status: status } : undefined }),
            ]);
            res.json({ success: true, data: checks, meta: { total, page, limit } });
        }
        catch (err) {
            next(err);
        }
    },
    /**
     * PATCH /background-check/admin/:userId/override  (admin only)
     * Manually approve or reject a background check (e.g. for manual review results).
     */
    async adminOverride(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
                throw new errorHandler_js_1.AppError('Admin access required', 403);
            }
            const schema = zod_1.z.object({
                status: zod_1.z.enum(['CLEAR', 'CONSIDER', 'CANCELLED']),
                adminNotes: zod_1.z.string().max(1000).optional(),
            });
            const { status, adminNotes } = schema.parse(req.body);
            const targetUserId = req.params.userId;
            const now = new Date();
            const check = await database_js_1.prisma.backgroundCheck.upsert({
                where: { userId: targetUserId },
                create: {
                    userId: targetUserId,
                    status,
                    adminNotes,
                    completedAt: now,
                    expiresAt: status === 'CLEAR'
                        ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
                        : undefined,
                },
                update: {
                    status,
                    adminNotes,
                    completedAt: now,
                    expiresAt: status === 'CLEAR'
                        ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
                        : null,
                },
            });
            // Notify user
            if (status === 'CLEAR') {
                await notification_service_js_1.notificationService.create(targetUserId, {
                    type: 'BACKGROUND_CHECK_APPROVED',
                    title: '✅ Background Check Approved!',
                    body: 'Your background check has been approved. You can now accept volunteer requests.',
                    data: { checkId: check.id },
                });
            }
            else if (status === 'CONSIDER') {
                await notification_service_js_1.notificationService.create(targetUserId, {
                    type: 'BACKGROUND_CHECK_REJECTED',
                    title: 'Background Check Update',
                    body: 'Your background check requires additional review. Please contact support.',
                    data: { checkId: check.id },
                });
            }
            logger_js_1.logger.info(`Admin ${req.user.id} overrode background check for user ${targetUserId} → ${status}`);
            res.json({ success: true, data: check });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=backgroundCheck.controller.js.map