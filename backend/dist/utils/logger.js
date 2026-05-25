"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const index_js_1 = require("../config/index.js");
const { combine, timestamp, errors, json, colorize, simple } = winston_1.default.format;
const fileTransport = new winston_daily_rotate_file_1.default({
    filename: `${process.env.LOG_DIR ?? 'logs'}/quickhelp-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: combine(timestamp(), errors({ stack: true }), json()),
});
const errorTransport = new winston_daily_rotate_file_1.default({
    level: 'error',
    filename: `${process.env.LOG_DIR ?? 'logs'}/error-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: combine(timestamp(), errors({ stack: true }), json()),
});
exports.logger = winston_1.default.createLogger({
    level: index_js_1.config.LOG_LEVEL,
    format: combine(timestamp(), errors({ stack: true }), json()),
    transports: [
        fileTransport,
        errorTransport,
        ...(index_js_1.config.isDev
            ? [new winston_1.default.transports.Console({ format: combine(colorize(), simple()) })]
            : [new winston_1.default.transports.Console({ format: combine(timestamp(), json()) })]),
    ],
});
//# sourceMappingURL=logger.js.map