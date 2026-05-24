import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '../config/index.js';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const fileTransport = new DailyRotateFile({
  filename: `${process.env.LOG_DIR ?? 'logs'}/quickhelp-%DATE%.log`,
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: combine(timestamp(), errors({ stack: true }), json()),
});

const errorTransport = new DailyRotateFile({
  level: 'error',
  filename: `${process.env.LOG_DIR ?? 'logs'}/error-%DATE%.log`,
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: combine(timestamp(), errors({ stack: true }), json()),
});

export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    fileTransport,
    errorTransport,
    ...(config.isDev
      ? [new winston.transports.Console({ format: combine(colorize(), simple()) })]
      : [new winston.transports.Console({ format: combine(timestamp(), json()) })]),
  ],
});
