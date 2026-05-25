import { Request, Response, NextFunction } from 'express';
export declare const backgroundCheckController: {
    /**
     * GET /background-check/status
     * Returns the current background check status for the authenticated user.
     */
    getStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /background-check/initiate
     * Submits personal info to Sterling and creates/updates the BackgroundCheck record.
     * Idempotent: calling again while PENDING/IN_PROGRESS returns the existing record.
     */
    initiate(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /background-check/webhook  (public endpoint — verified via HMAC)
     * Called by Sterling when a check is completed.
     * Raw body must be preserved for signature verification (use express.raw middleware).
     */
    webhook(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /background-check/admin/list  (admin only)
     * Returns paginated background checks for admin review.
     */
    adminList(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * PATCH /background-check/admin/:userId/override  (admin only)
     * Manually approve or reject a background check (e.g. for manual review results).
     */
    adminOverride(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=backgroundCheck.controller.d.ts.map