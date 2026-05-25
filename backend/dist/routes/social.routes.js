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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const social = __importStar(require("../services/social.service"));
const cloudinary_1 = require("../config/cloudinary");
const router = (0, express_1.Router)();
// ─── Media upload (local disk, S3 optional) ───────────────────────────────────
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir))
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
const mediaUpload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadsDir),
        filename: (_req, file, cb) => {
            const ext = path_1.default.extname(file.originalname) || (file.mimetype.startsWith('video') ? '.mp4' : '.jpg');
            cb(null, `media-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
        },
    }),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB for videos
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image and video files allowed'));
        }
    },
});
// ─── PROFILE ─────────────────────────────────────────────────────────────────
router.get('/users/:userId/profile', async (req, res, next) => {
    try {
        const viewerId = req.user?.id;
        const profile = await social.getPublicProfile(req.params.userId, viewerId);
        res.json({ success: true, data: profile });
    }
    catch (err) {
        next(err);
    }
});
// ─── FOLLOW ──────────────────────────────────────────────────────────────────
router.post('/users/:userId/follow', auth_1.authenticate, async (req, res, next) => {
    try {
        const result = await social.followUser(req.user.id, req.params.userId);
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/users/:userId/follow', auth_1.authenticate, async (req, res, next) => {
    try {
        await social.unfollowUser(req.user.id, req.params.userId);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
router.get('/users/:userId/followers', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const result = await social.getFollowers(req.params.userId, page);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
router.get('/users/:userId/following', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const result = await social.getFollowing(req.params.userId, page);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
// ─── POSTS ───────────────────────────────────────────────────────────────────
router.get('/feed', async (req, res, next) => {
    try {
        const viewerId = req.user?.id;
        const page = parseInt(req.query.page) || 1;
        const posts = await social.getPublicFeed(page, 20, viewerId);
        res.json({ success: true, data: posts });
    }
    catch (err) {
        next(err);
    }
});
router.get('/feed/following', auth_1.authenticate, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const posts = await social.getFollowingFeed(req.user.id, page);
        res.json({ success: true, data: posts });
    }
    catch (err) {
        next(err);
    }
});
router.get('/users/:userId/posts', async (req, res, next) => {
    try {
        const viewerId = req.user?.id;
        const page = parseInt(req.query.page) || 1;
        const posts = await social.getUserPosts(req.params.userId, viewerId, page);
        res.json({ success: true, data: posts });
    }
    catch (err) {
        next(err);
    }
});
router.post('/posts', auth_1.authenticate, mediaUpload.single('media'), async (req, res, next) => {
    try {
        const { content, imageUrl, videoUrl, visibility, linkedRequestId } = req.body;
        const file = req.file;
        const baseUrl = process.env.API_BASE_URL ?? `http://localhost:4000`;
        let resolvedImageUrl = imageUrl;
        let resolvedVideoUrl = videoUrl;
        if (file && file.path) {
            const isVideo = file.mimetype?.startsWith('video/');
            const resourceType = isVideo ? 'video' : 'image';
            const folder = isVideo ? 'quickhelp/videos' : 'quickhelp/posts';
            // Try Cloudinary first; fall back to local URL
            const cloudUrl = await (0, cloudinary_1.uploadToCloudinary)(file.path, folder, resourceType);
            if (cloudUrl) {
                if (isVideo)
                    resolvedVideoUrl = cloudUrl;
                else
                    resolvedImageUrl = cloudUrl;
            }
            else if (file.filename) {
                const fileUrl = `${baseUrl}/uploads/${file.filename}`;
                if (isVideo)
                    resolvedVideoUrl = fileUrl;
                else
                    resolvedImageUrl = fileUrl;
            }
        }
        const post = await social.createPost(req.user.id, content, resolvedImageUrl, visibility, linkedRequestId, resolvedVideoUrl);
        res.status(201).json({ success: true, data: post });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/posts/:postId', auth_1.authenticate, async (req, res, next) => {
    try {
        await social.deletePost(req.params.postId, req.user.id);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
// ─── LIKES ───────────────────────────────────────────────────────────────────
router.post('/posts/:postId/like', auth_1.authenticate, async (req, res, next) => {
    try {
        await social.likePost(req.params.postId, req.user.id);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/posts/:postId/like', auth_1.authenticate, async (req, res, next) => {
    try {
        await social.unlikePost(req.params.postId, req.user.id);
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
// ─── COMMENTS ────────────────────────────────────────────────────────────────
router.get('/posts/:postId/comments', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const result = await social.getComments(req.params.postId, page);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
router.post('/posts/:postId/comments', auth_1.authenticate, async (req, res, next) => {
    try {
        const comment = await social.addComment(req.params.postId, req.user.id, req.body.content);
        res.status(201).json({ success: true, data: comment });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=social.routes.js.map