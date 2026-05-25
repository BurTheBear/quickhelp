"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestController = void 0;
const request_service_js_1 = require("../services/request.service.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
exports.requestController = {
    async getFeed(req, res, next) {
        try {
            const result = await request_service_js_1.requestService.getFeed(req.user?.id, req.query);
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    },
    async getMapRequests(req, res, next) {
        try {
            const { north, south, east, west } = req.query;
            if (!north || !south || !east || !west) {
                throw new errorHandler_js_1.AppError('Map bounds required', 400);
            }
            const requests = await request_service_js_1.requestService.getMapRequests({
                north: Number(north),
                south: Number(south),
                east: Number(east),
                west: Number(west),
            });
            res.json({ success: true, data: requests });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            const request = await request_service_js_1.requestService.getById(req.params.id, req.user?.id);
            res.json({ success: true, data: request });
        }
        catch (err) {
            next(err);
        }
    },
    async getMyRequests(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const type = req.query.type ?? 'made';
            const requests = await request_service_js_1.requestService.getMyRequests(req.user.id, type);
            res.json({ success: true, data: requests });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const request = await request_service_js_1.requestService.create(req.user.id, req.body);
            res.status(201).json({ success: true, data: request });
        }
        catch (err) {
            next(err);
        }
    },
    async uploadImage(req, res, next) {
        try {
            // Handled by multer-s3 middleware; file URL available on req.file
            const file = req.file;
            if (!file)
                throw new errorHandler_js_1.AppError('No file uploaded', 400);
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/database.js')));
            const image = await prisma.requestImage.create({
                data: {
                    requestId: req.params.id,
                    url: file.location,
                },
            });
            res.status(201).json({ success: true, data: image });
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/database.js')));
            const request = await prisma.helpRequest.findFirst({
                where: { id: req.params.id, authorId: req.user.id, deletedAt: null },
            });
            if (!request)
                throw new errorHandler_js_1.AppError('Request not found', 404);
            if (request.status !== 'OPEN')
                throw new errorHandler_js_1.AppError('Cannot edit a non-open request', 400);
            const updated = await prisma.helpRequest.update({
                where: { id: req.params.id },
                data: {
                    ...(req.body.title ? { title: req.body.title } : {}),
                    ...(req.body.description ? { description: req.body.description } : {}),
                    ...(req.body.urgency ? { urgency: req.body.urgency } : {}),
                },
            });
            res.json({ success: true, data: updated });
        }
        catch (err) {
            next(err);
        }
    },
    async cancel(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            await request_service_js_1.requestService.cancel(req.params.id, req.user.id);
            res.json({ success: true, message: 'Request cancelled' });
        }
        catch (err) {
            next(err);
        }
    },
    async remove(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/database.js')));
            const request = await prisma.helpRequest.findFirst({
                where: { id: req.params.id, authorId: req.user.id, deletedAt: null },
            });
            if (!request)
                throw new errorHandler_js_1.AppError('Request not found', 404);
            // Soft delete
            await prisma.helpRequest.update({
                where: { id: req.params.id },
                data: { deletedAt: new Date(), status: 'CANCELLED' },
            });
            res.json({ success: true, message: 'Request deleted' });
        }
        catch (err) {
            next(err);
        }
    },
    async report(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/database.js')));
            await prisma.report.create({
                data: {
                    authorId: req.user.id,
                    reportedRequestId: req.params.id,
                    reason: req.body.reason,
                    description: req.body.description ?? '',
                },
            });
            res.json({ success: true, message: 'Report submitted' });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=request.controller.js.map