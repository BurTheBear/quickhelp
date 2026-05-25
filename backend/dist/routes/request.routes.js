"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const request_controller_js_1 = require("../controllers/request.controller.js");
const auth_js_1 = require("../middleware/auth.js");
const validate_js_1 = require("../middleware/validate.js");
const rateLimiter_js_1 = require("../middleware/rateLimiter.js");
exports.requestRouter = (0, express_1.Router)();
const createRequestSchema = zod_1.z.object({
    title: zod_1.z.string().min(5).max(100),
    description: zod_1.z.string().min(10).max(1000),
    category: zod_1.z.enum([
        'ELDERLY_ASSISTANCE', 'TUTORING', 'FOOD_DELIVERY',
        'COMMUNITY_CLEANUP', 'PET_HELP', 'TECH_SUPPORT',
        'TRANSPORTATION', 'EMERGENCY', 'OTHER',
    ]),
    urgency: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']).default('MEDIUM'),
    estimatedMinutes: zod_1.z.number().min(5).max(480).default(30),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    address: zod_1.z.string().max(200).optional(),
    locationNotes: zod_1.z.string().max(200).optional(),
    requiredSkills: zod_1.z.array(zod_1.z.string()).max(5).default([]),
    expiresInHours: zod_1.z.number().min(1).max(72).optional(),
});
const feedQuerySchema = zod_1.z.object({
    lat: zod_1.z.string().transform(Number).optional(),
    lng: zod_1.z.string().transform(Number).optional(),
    radius: zod_1.z.string().transform(Number).default('10'),
    category: zod_1.z.string().optional(),
    urgency: zod_1.z.string().optional(),
    status: zod_1.z.string().default('OPEN'),
    page: zod_1.z.string().transform(Number).default('1'),
    limit: zod_1.z.string().transform(Number).default('20'),
    sort: zod_1.z.enum(['distance', 'newest', 'urgency', 'points']).default('distance'),
});
exports.requestRouter.get('/', auth_js_1.optionalAuth, (0, validate_js_1.validate)(feedQuerySchema, 'query'), request_controller_js_1.requestController.getFeed);
exports.requestRouter.get('/map', auth_js_1.optionalAuth, request_controller_js_1.requestController.getMapRequests);
exports.requestRouter.get('/my', auth_js_1.authenticate, request_controller_js_1.requestController.getMyRequests);
exports.requestRouter.get('/:id', auth_js_1.optionalAuth, request_controller_js_1.requestController.getById);
exports.requestRouter.post('/', auth_js_1.authenticate, (0, validate_js_1.validate)(createRequestSchema), request_controller_js_1.requestController.create);
exports.requestRouter.post('/:id/images', auth_js_1.authenticate, rateLimiter_js_1.uploadRateLimiter, request_controller_js_1.requestController.uploadImage);
exports.requestRouter.patch('/:id', auth_js_1.authenticate, request_controller_js_1.requestController.update);
exports.requestRouter.patch('/:id/cancel', auth_js_1.authenticate, request_controller_js_1.requestController.cancel);
exports.requestRouter.delete('/:id', auth_js_1.authenticate, request_controller_js_1.requestController.remove);
exports.requestRouter.post('/:id/report', auth_js_1.authenticate, request_controller_js_1.requestController.report);
//# sourceMappingURL=request.routes.js.map