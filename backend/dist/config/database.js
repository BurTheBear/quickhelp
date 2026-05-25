"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const client_1 = require("@prisma/client");
const index_js_1 = require("./index.js");
const logger_js_1 = require("../utils/logger.js");
const globalForPrisma = global;
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        log: index_js_1.config.isDev
            ? [
                { emit: 'event', level: 'query' },
                { emit: 'event', level: 'error' },
                { emit: 'event', level: 'warn' },
            ]
            : [{ emit: 'event', level: 'error' }],
    });
if (index_js_1.config.isDev) {
    exports.prisma.$on('query', (e) => {
        if (e.duration > 200) {
            logger_js_1.logger.debug(`Slow query (${e.duration}ms): ${e.query.substring(0, 100)}`);
        }
    });
}
exports.prisma.$on('error', (e) => {
    logger_js_1.logger.error('Prisma error:', e.message);
});
if (index_js_1.config.isDev)
    globalForPrisma.prisma = exports.prisma;
async function connectDatabase() {
    await exports.prisma.$connect();
    logger_js_1.logger.info('Database connected');
}
async function disconnectDatabase() {
    await exports.prisma.$disconnect();
    logger_js_1.logger.info('Database disconnected');
}
//# sourceMappingURL=database.js.map