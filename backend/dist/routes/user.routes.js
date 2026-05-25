"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const user_controller_js_1 = require("../controllers/user.controller.js");
const auth_js_1 = require("../middleware/auth.js");
const validate_js_1 = require("../middleware/validate.js");
exports.userRouter = (0, express_1.Router)();
// ─── Disk upload (no S3 needed for dev) ──────────────────────────────────────
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir))
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
const diskStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname) || '.jpg';
        cb(null, `avatar-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage: diskStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image and video files are allowed'));
        }
    },
});
// ─── Schemas ──────────────────────────────────────────────────────────────────
const updateProfileSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(2).max(50).optional(),
    bio: zod_1.z.string().max(500).optional(),
    phone: zod_1.z.string().optional(),
    avatarUrl: zod_1.z.string().max(2000).optional(), // emoji:// or https:// URL
    skills: zod_1.z.array(zod_1.z.string()).max(10).optional(),
    interests: zod_1.z.array(zod_1.z.string()).max(10).optional(),
    languages: zod_1.z.array(zod_1.z.string()).max(5).optional(),
    latitude: zod_1.z.number().min(-90).max(90).optional(),
    longitude: zod_1.z.number().min(-180).max(180).optional(),
    city: zod_1.z.string().max(100).optional(),
    state: zod_1.z.string().max(100).optional(),
    radius: zod_1.z.number().min(1).max(100).optional(),
    isAvailable: zod_1.z.boolean().optional(),
});
const ratingSchema = zod_1.z.object({
    requestId: zod_1.z.string().cuid(),
    recipientId: zod_1.z.string().cuid(),
    score: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().max(500).optional(),
    tags: zod_1.z.array(zod_1.z.string()).max(5).default([]),
});
// ─── Routes ───────────────────────────────────────────────────────────────────
exports.userRouter.get('/profile/:id', auth_js_1.optionalAuth, user_controller_js_1.userController.getProfile);
exports.userRouter.get('/me/stats', auth_js_1.authenticate, user_controller_js_1.userController.getMyStats);
exports.userRouter.get('/me/badges', auth_js_1.authenticate, user_controller_js_1.userController.getMyBadges);
exports.userRouter.get('/me/achievements', auth_js_1.authenticate, user_controller_js_1.userController.getMyAchievements);
exports.userRouter.put('/me/profile', auth_js_1.authenticate, (0, validate_js_1.validate)(updateProfileSchema), user_controller_js_1.userController.updateProfile);
// Avatar upload — multipart (real photo) OR JSON avatarUrl (emoji)
exports.userRouter.post('/me/avatar', auth_js_1.authenticate, upload.single('avatar'), user_controller_js_1.userController.uploadAvatar);
exports.userRouter.post('/me/location', auth_js_1.authenticate, user_controller_js_1.userController.updateLocation);
exports.userRouter.post('/me/device-token', auth_js_1.authenticate, user_controller_js_1.userController.registerDeviceToken);
exports.userRouter.delete('/me/device-token', auth_js_1.authenticate, user_controller_js_1.userController.removeDeviceToken);
exports.userRouter.post('/rate', auth_js_1.authenticate, (0, validate_js_1.validate)(ratingSchema), user_controller_js_1.userController.rateUser);
exports.userRouter.post('/:id/report', auth_js_1.authenticate, user_controller_js_1.userController.reportUser);
//# sourceMappingURL=user.routes.js.map