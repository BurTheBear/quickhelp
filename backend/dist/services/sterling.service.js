"use strict";
/**
 * Sterling Talent Solutions – Background Check Integration
 *
 * API Docs: https://developer.sterlingcheck.com
 *
 * Env vars required:
 *   STERLING_API_KEY         – Your Sterling API key (Bearer token)
 *   STERLING_ACCOUNT_ID      – Sterling account / client ID
 *   STERLING_PACKAGE_ID      – Background check package to run (e.g. "basic_criminal")
 *   STERLING_WEBHOOK_SECRET  – Secret for HMAC-SHA256 webhook signature verification
 *   STERLING_SANDBOX         – "true" to hit sandbox; omit / "false" for production
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sterlingService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_js_1 = require("../utils/logger.js");
// ─── Config ──────────────────────────────────────────────────────────────────
const IS_SANDBOX = process.env.STERLING_SANDBOX === 'true';
const BASE_URL = IS_SANDBOX
    ? 'https://api-sandbox.sterlingcheck.com/v1'
    : 'https://api.sterlingcheck.com/v1';
const STERLING_API_KEY = process.env.STERLING_API_KEY ?? '';
const STERLING_ACCOUNT_ID = process.env.STERLING_ACCOUNT_ID ?? '';
const STERLING_PACKAGE_ID = process.env.STERLING_PACKAGE_ID ?? 'basic_criminal_national';
const STERLING_WEBHOOK_SECRET = process.env.STERLING_WEBHOOK_SECRET ?? '';
// ─── Helpers ─────────────────────────────────────────────────────────────────
function sterlingHeaders() {
    return {
        Authorization: `Bearer ${STERLING_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Account-Id': STERLING_ACCOUNT_ID,
    };
}
async function sterlingFetch(path, init) {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, { ...init, headers: { ...sterlingHeaders(), ...(init?.headers ?? {}) } });
    if (!res.ok) {
        const body = await res.text().catch(() => '(no body)');
        logger_js_1.logger.error(`Sterling API ${init?.method ?? 'GET'} ${path} → ${res.status}: ${body}`);
        throw new Error(`Sterling API error ${res.status}: ${body}`);
    }
    return res.json();
}
// ─── Service ─────────────────────────────────────────────────────────────────
exports.sterlingService = {
    /** Returns true when the Sterling API key is configured. */
    isConfigured() {
        return Boolean(STERLING_API_KEY && STERLING_ACCOUNT_ID);
    },
    /**
     * Initiates a background check for a candidate.
     * Transmits SSN to Sterling – does NOT store it.
     */
    async initiateCheck(input) {
        if (!this.isConfigured()) {
            // Sandbox / dev fallback – return a fake order so devs can test the flow
            if (IS_SANDBOX || process.env.NODE_ENV !== 'production') {
                logger_js_1.logger.warn('Sterling not configured – returning mock order for development');
                return {
                    orderId: `mock-order-${Date.now()}`,
                    candidateId: `mock-candidate-${Date.now()}`,
                    status: 'PENDING',
                };
            }
            throw new Error('Sterling API key not configured');
        }
        // Step 1 – create or look up candidate
        const candidate = await sterlingFetch('/candidates', {
            method: 'POST',
            body: JSON.stringify({
                first_name: input.firstName,
                last_name: input.lastName,
                email: input.email,
                dob: input.dateOfBirth,
                ssn: input.ssn,
                zip_code: input.zipCode,
                phone: input.phone,
            }),
        });
        // Step 2 – submit order
        const order = await sterlingFetch('/orders', {
            method: 'POST',
            body: JSON.stringify({
                candidate_id: candidate.id,
                package_id: STERLING_PACKAGE_ID,
                // Request webhook callbacks to our /background-check/webhook endpoint
                notification_url: process.env.API_BASE_URL
                    ? `${process.env.API_BASE_URL}/api/v1/background-check/webhook`
                    : undefined,
            }),
        });
        logger_js_1.logger.info(`Sterling order created: ${order.id} for candidate ${order.candidate_id}`);
        return {
            orderId: order.id,
            candidateId: order.candidate_id,
            status: order.status,
            reportUrl: order.report_url,
        };
    },
    /** Polls Sterling for the current status of an order. */
    async getOrderStatus(orderId) {
        if (!this.isConfigured()) {
            // Dev mock: after 30 s pretend it passed
            return { orderId, status: 'PENDING' };
        }
        const data = await sterlingFetch(`/orders/${orderId}`);
        return {
            orderId: data.id,
            status: mapSterlingStatus(data.status, data.result),
            reportId: data.report_id,
            reportUrl: data.report_url,
            completedAt: data.completed_at,
        };
    },
    /**
     * Verifies the HMAC-SHA256 signature on incoming Sterling webhooks.
     * Sterling sends the signature in the `X-Sterling-Signature` header
     * as `sha256=<hex_digest>`.
     */
    verifyWebhookSignature(rawBody, signatureHeader) {
        if (!STERLING_WEBHOOK_SECRET) {
            if (process.env.NODE_ENV !== 'production') {
                logger_js_1.logger.warn('Sterling webhook secret not set – skipping signature check in dev');
                return true;
            }
            logger_js_1.logger.error('Sterling webhook secret not configured in production');
            return false;
        }
        const expected = `sha256=${crypto_1.default
            .createHmac('sha256', STERLING_WEBHOOK_SECRET)
            .update(rawBody, 'utf8')
            .digest('hex')}`;
        // timing-safe comparison prevents timing attacks
        try {
            const aBuf = Buffer.from(signatureHeader);
            const bBuf = Buffer.from(expected);
            if (aBuf.length !== bBuf.length)
                return false;
            return crypto_1.default.timingSafeEqual(aBuf, bBuf);
        }
        catch {
            return false;
        }
    },
    /**
     * Parses a Sterling webhook payload and maps it to our internal status.
     */
    parseWebhook(payload) {
        return {
            orderId: payload.orderId,
            status: mapSterlingStatus(payload.status, payload.result),
            reportId: payload.reportId,
            completedAt: payload.completedAt,
        };
    },
};
// ─── Status mapping ───────────────────────────────────────────────────────────
/**
 * Sterling order statuses → our BackgroundCheckStatus enum.
 *
 * Sterling statuses:  pending | in_progress | complete | cancelled
 * Sterling results:   clear   | consider    | dispute
 */
function mapSterlingStatus(status, result) {
    const s = status?.toLowerCase();
    const r = result?.toLowerCase();
    if (s === 'cancelled')
        return 'CANCELLED';
    if (s === 'pending')
        return 'PENDING';
    if (s === 'in_progress' || s === 'processing')
        return 'IN_PROGRESS';
    if (s === 'complete' || s === 'completed') {
        if (r === 'clear')
            return 'CLEAR';
        if (r === 'dispute')
            return 'DISPUTE';
        if (r === 'consider')
            return 'CONSIDER';
        return 'CONSIDER'; // safe default for unknown results
    }
    return 'PENDING'; // unknown → treat as pending
}
//# sourceMappingURL=sterling.service.js.map