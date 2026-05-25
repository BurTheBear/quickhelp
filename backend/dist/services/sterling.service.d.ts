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
export interface SterlingCandidateInput {
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: string;
    ssn?: string;
    zipCode?: string;
    phone?: string;
}
export interface SterlingOrderResult {
    orderId: string;
    candidateId: string;
    status: string;
    reportUrl?: string;
}
export type SterlingResult = 'CLEAR' | 'CONSIDER' | 'DISPUTE' | 'CANCELLED' | 'PENDING' | 'IN_PROGRESS';
export interface SterlingStatusResult {
    orderId: string;
    status: SterlingResult;
    reportId?: string;
    reportUrl?: string;
    completedAt?: string;
}
export interface SterlingWebhookPayload {
    event: string;
    orderId: string;
    candidateId: string;
    status: string;
    result?: string;
    reportId?: string;
    completedAt?: string;
    [key: string]: unknown;
}
export declare const sterlingService: {
    /** Returns true when the Sterling API key is configured. */
    isConfigured(): boolean;
    /**
     * Initiates a background check for a candidate.
     * Transmits SSN to Sterling – does NOT store it.
     */
    initiateCheck(input: SterlingCandidateInput): Promise<SterlingOrderResult>;
    /** Polls Sterling for the current status of an order. */
    getOrderStatus(orderId: string): Promise<SterlingStatusResult>;
    /**
     * Verifies the HMAC-SHA256 signature on incoming Sterling webhooks.
     * Sterling sends the signature in the `X-Sterling-Signature` header
     * as `sha256=<hex_digest>`.
     */
    verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;
    /**
     * Parses a Sterling webhook payload and maps it to our internal status.
     */
    parseWebhook(payload: SterlingWebhookPayload): SterlingStatusResult;
};
//# sourceMappingURL=sterling.service.d.ts.map