import { Router, Request, Response, NextFunction } from 'express';
import { backgroundCheckController } from '../controllers/backgroundCheck.controller.js';
import { authenticate } from '../middleware/auth.js';

export const backgroundCheckRouter = Router();

// ─── Volunteer-facing routes (authenticated) ─────────────────────────────────

/** Returns the current background check status for the logged-in user. */
backgroundCheckRouter.get('/status', authenticate, backgroundCheckController.getStatus);

/** Submits personal info to Sterling and starts the background check. */
backgroundCheckRouter.post('/initiate', authenticate, backgroundCheckController.initiate);

// ─── Dev simulator (blocked in production) ───────────────────────────────────

/**
 * POST /background-check/dev/simulate?result=clear|consider
 * Instantly marks the authenticated user's check as CLEAR or CONSIDER
 * and fires the push notification — great for testing the full flow.
 * Returns 404 in production.
 */
backgroundCheckRouter.post('/dev/simulate', authenticate, backgroundCheckController.devSimulate);

// ─── Admin routes ─────────────────────────────────────────────────────────────

/** Paginated list of all background checks (admin only). */
backgroundCheckRouter.get('/admin/list', authenticate, backgroundCheckController.adminList);

/** Manually approve or reject a user's background check (admin only). */
backgroundCheckRouter.patch('/admin/:userId/override', authenticate, backgroundCheckController.adminOverride);

// ─── Sterling webhook (public — verified via HMAC signature) ─────────────────

/**
 * Sterling calls this endpoint when a background check completes.
 * We need the raw body for HMAC verification, so we capture it in a
 * custom middleware before JSON parsing overwrites it.
 */
backgroundCheckRouter.post(
  '/webhook',
  (req: Request, _res: Response, next: NextFunction) => {
    // Capture the raw body as a string for signature verification.
    // express.json() has already been applied globally, so we read from
    // the Buffer that express stored on req if raw-body middleware is active.
    // Attach rawBody for the controller.
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString('utf8'); });
    req.on('end', () => {
      (req as any).rawBody = data || JSON.stringify(req.body);
      next();
    });
    req.on('error', next);
  },
  backgroundCheckController.webhook
);
