"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupController = void 0;
const database_js_1 = require("../config/database.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
exports.groupController = {
    async list(req, res, next) {
        try {
            const { city, search } = req.query;
            const groups = await database_js_1.prisma.communityGroup.findMany({
                where: {
                    isPublic: true,
                    ...(city ? { city: { contains: String(city), mode: 'insensitive' } } : {}),
                    ...(search ? { name: { contains: String(search), mode: 'insensitive' } } : {}),
                },
                include: { _count: { select: { members: true } } },
                orderBy: { createdAt: 'desc' },
                take: 20,
            });
            res.json({ success: true, data: groups });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            const group = await database_js_1.prisma.communityGroup.findUnique({
                where: { id: req.params.id },
                include: {
                    _count: { select: { members: true } },
                    members: {
                        take: 10,
                        include: {
                            user: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
                        },
                    },
                },
            });
            if (!group)
                throw new errorHandler_js_1.AppError('Group not found', 404);
            res.json({ success: true, data: group });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const group = await database_js_1.prisma.communityGroup.create({
                data: { ...req.body, createdById: req.user.id },
            });
            await database_js_1.prisma.groupMember.create({
                data: { groupId: group.id, userId: req.user.id, role: 'ADMIN' },
            });
            res.status(201).json({ success: true, data: group });
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const isMod = await database_js_1.prisma.groupMember.findFirst({
                where: { groupId: req.params.id, userId: req.user.id, role: { in: ['ADMIN', 'MODERATOR'] } },
            });
            if (!isMod && req.user.role !== 'ADMIN')
                throw new errorHandler_js_1.AppError('Forbidden', 403);
            const group = await database_js_1.prisma.communityGroup.update({
                where: { id: req.params.id },
                data: req.body,
            });
            res.json({ success: true, data: group });
        }
        catch (err) {
            next(err);
        }
    },
    async join(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            const existing = await database_js_1.prisma.groupMember.findUnique({
                where: { groupId_userId: { groupId: req.params.id, userId: req.user.id } },
            });
            if (existing)
                throw new errorHandler_js_1.AppError('Already a member', 409);
            await database_js_1.prisma.groupMember.create({
                data: { groupId: req.params.id, userId: req.user.id },
            });
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    },
    async leave(req, res, next) {
        try {
            if (!req.user)
                throw new errorHandler_js_1.AppError('Not authenticated', 401);
            await database_js_1.prisma.groupMember.deleteMany({
                where: { groupId: req.params.id, userId: req.user.id },
            });
            res.json({ success: true });
        }
        catch (err) {
            next(err);
        }
    },
    async getMembers(req, res, next) {
        try {
            const members = await database_js_1.prisma.groupMember.findMany({
                where: { groupId: req.params.id },
                include: {
                    user: {
                        select: {
                            id: true,
                            profile: { select: { displayName: true, avatarUrl: true, tasksCompleted: true } },
                            gamification: { select: { level: true, levelName: true } },
                        },
                    },
                },
                orderBy: { joinedAt: 'asc' },
                take: 50,
            });
            res.json({ success: true, data: members });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=group.controller.js.map