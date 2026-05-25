"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const logger_js_1 = require("../utils/logger.js");
class AppError extends Error {
    message;
    statusCode;
    isOperational;
    details;
    constructor(message, statusCode = 500, isOperational = true, details) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, _next) => {
    const requestId = req.headers['x-request-id'] ?? 'unknown';
    // Prisma errors
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        const prismaError = handlePrismaError(err);
        res.status(prismaError.statusCode).json({
            success: false,
            error: prismaError.message,
            requestId,
        });
        return;
    }
    // Zod validation errors
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
            requestId,
        });
        return;
    }
    // Known operational errors
    if (err instanceof AppError && err.isOperational) {
        if (err.statusCode >= 500) {
            logger_js_1.logger.error(`[${requestId}] ${err.message}`, { stack: err.stack, details: err.details });
        }
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
            ...(err.details ? { details: err.details } : {}),
            requestId,
        });
        return;
    }
    // Unknown errors — don't leak internals
    logger_js_1.logger.error(`[${requestId}] Unhandled error: ${err.message}`, {
        stack: err.stack,
        url: req.url,
        method: req.method,
    });
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        requestId,
    });
};
exports.errorHandler = errorHandler;
function handlePrismaError(err) {
    switch (err.code) {
        case 'P2002':
            return new AppError(`Duplicate value for field: ${err.meta?.target?.join(', ')}`, 409);
        case 'P2025':
            return new AppError('Record not found', 404);
        case 'P2003':
            return new AppError('Referenced record not found', 400);
        case 'P2016':
            return new AppError('Query interpretation error', 400);
        default:
            return new AppError('Database error', 500, false);
    }
}
//# sourceMappingURL=errorHandler.js.map