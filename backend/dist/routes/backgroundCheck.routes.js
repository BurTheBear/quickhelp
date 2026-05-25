"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backgroundCheckRouter = void 0;
const express_1 = require("express");
const backgroundCheck_controller_js_1 = require("../controllers/backgroundCheck.controller.js");
const auth_js_1 = require("../middleware/auth.js");
exports.backgroundCheckRouter = (0, express_1.Router)();
// ─── Volunteer-facing routes (authenticated) ─────────────────────────────────
/** Returns the current background check status for the logged-in user. */
exports.backgroundCheckRouter.get('/status', auth_js_1.authenticate, backgroundCheck_controller_js_1.backgroundCheckController.getStatus);
/** Submits personal info to Sterling and starts the background check. */
exports.backgroundCheckRouter.post('/initiate', auth_js_1.authenticate, backgroundCheck_controller_js_1.backgroundCheckController.initiate);
// ─── Dev simulator (blocked in production) ───────────────────────────────────
/**
 * POST /background-check/dev/simulate?result=clear|consider
 * Instantly marks the authenticated user's check as CLEAR or CONSIDER
 * and fires the push notification — great for testing the full flow.
 * Returns 404 in production.
 */
exports.backgroundCheckRouter.post('/dev/simulate', auth_js_1.authenticate, backgroundCheck_controller_js_1.backgroundCheckController.devSimulate);
// ─── Admin routes ─────────────────────────────────────────────────────────────
/** Paginated list of all background checks (admin only). */
exports.backgroundCheckRouter.get('/admin/list', auth_js_1.authenticate, backgroundCheck_controller_js_1.backgroundCheckController.adminList);
/** Manually approve or reject a user's background check (admin only). */
exports.backgroundCheckRouter.patch('/admin/:userId/override', auth_js_1.authenticate, backgroundCheck_controller_js_1.backgroundCheckController.adminOverride);
// ─── Sterling webhook (public — verified via HMAC signature) ─────────────────
/**
 * Sterling calls this endpoint when a background check completes.
 * We need the raw body for HMAC verification, so we capture it in a
 * custom middleware before JSON parsing overwrites it.
 */
exports.backgroundCheckRouter.post('/webhook', (req, _res, next) => {
    // Capture the raw body as a string for signature verification.
    // express.json() has already been applied globally, so we read from
    // the Buffer that express stored on req if raw-body middleware is active.
    // Attach rawBody for the controller.
    let data = '';
    req.on('data', (chunk) => { data += chunk.toString('utf8'); });
    req.on('end', () => {
        req.rawBody = data || JSON.stringify(req.body);
        next();
    });
    req.on('error', next);
}, backgroundCheck_controller_js_1.backgroundCheckController.webhook);
//# sourceMappingURL=backgroundCheck.routes.js.map