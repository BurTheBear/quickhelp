import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';
import * as social from '../services/social.service';
import { uploadToCloudinary } from '../config/cloudinary';

const router = Router();

// ─── Media upload (local disk, S3 optional) ───────────────────────────────────
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const mediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || (file.mimetype.startsWith('video') ? '.mp4' : '.jpg');
      cb(null, `media-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB for videos
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files allowed'));
    }
  },
});

// ─── PROFILE ─────────────────────────────────────────────────────────────────

router.get('/users/:userId/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const viewerId = (req as any).user?.id;
    const profile = await social.getPublicProfile(req.params.userId, viewerId);
    res.json({ success: true, data: profile });
  } catch (err) { next(err); }
});

// ─── FOLLOW ──────────────────────────────────────────────────────────────────

router.post('/users/:userId/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await social.followUser((req as any).user.id, req.params.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.delete('/users/:userId/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await social.unfollowUser((req as any).user.id, req.params.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/users/:userId/followers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const result = await social.getFollowers(req.params.userId, page);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.get('/users/:userId/following', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const result = await social.getFollowing(req.params.userId, page);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── POSTS ───────────────────────────────────────────────────────────────────

router.get('/feed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const viewerId = (req as any).user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const posts = await social.getPublicFeed(page, 20, viewerId);
    res.json({ success: true, data: posts });
  } catch (err) { next(err); }
});

router.get('/feed/following', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const posts = await social.getFollowingFeed((req as any).user.id, page);
    res.json({ success: true, data: posts });
  } catch (err) { next(err); }
});

router.get('/users/:userId/posts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const viewerId = (req as any).user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const posts = await social.getUserPosts(req.params.userId, viewerId, page);
    res.json({ success: true, data: posts });
  } catch (err) { next(err); }
});

router.post('/posts', authenticate, mediaUpload.single('media'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, imageUrl, videoUrl, visibility, linkedRequestId } = req.body;
    const file = (req as any).file as { filename?: string; mimetype?: string } | undefined;

    const baseUrl = process.env.API_BASE_URL ?? `http://localhost:4000`;
    let resolvedImageUrl = imageUrl;
    let resolvedVideoUrl = videoUrl;

    if (file && (file as any).path) {
      const isVideo = file.mimetype?.startsWith('video/');
      const resourceType = isVideo ? 'video' : 'image';
      const folder = isVideo ? 'quickhelp/videos' : 'quickhelp/posts';

      // Try Cloudinary first; fall back to local URL
      const cloudUrl = await uploadToCloudinary((file as any).path, folder, resourceType);
      if (cloudUrl) {
        if (isVideo) resolvedVideoUrl = cloudUrl;
        else resolvedImageUrl = cloudUrl;
      } else if (file.filename) {
        const fileUrl = `${baseUrl}/uploads/${file.filename}`;
        if (isVideo) resolvedVideoUrl = fileUrl;
        else resolvedImageUrl = fileUrl;
      }
    }

    const post = await social.createPost(
      (req as any).user.id, content, resolvedImageUrl, visibility, linkedRequestId, resolvedVideoUrl,
    );
    res.status(201).json({ success: true, data: post });
  } catch (err) { next(err); }
});

router.delete('/posts/:postId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await social.deletePost(req.params.postId, (req as any).user.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── LIKES ───────────────────────────────────────────────────────────────────

router.post('/posts/:postId/like', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await social.likePost(req.params.postId, (req as any).user.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/posts/:postId/like', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await social.unlikePost(req.params.postId, (req as any).user.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── COMMENTS ────────────────────────────────────────────────────────────────

router.get('/posts/:postId/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const result = await social.getComments(req.params.postId, page);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/posts/:postId/comments', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await social.addComment(
      req.params.postId, (req as any).user.id, req.body.content,
    );
    res.status(201).json({ success: true, data: comment });
  } catch (err) { next(err); }
});

export default router;
