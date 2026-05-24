import { Request, Response, NextFunction } from 'express';
import { requestService } from '../services/request.service.js';
import { AppError } from '../middleware/errorHandler.js';

export const requestController = {
  async getFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await requestService.getFeed(req.user?.id, req.query as never);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getMapRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { north, south, east, west } = req.query;
      if (!north || !south || !east || !west) {
        throw new AppError('Map bounds required', 400);
      }

      const requests = await requestService.getMapRequests({
        north: Number(north),
        south: Number(south),
        east: Number(east),
        west: Number(west),
      });
      res.json({ success: true, data: requests });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = await requestService.getById(req.params.id, req.user?.id);
      res.json({ success: true, data: request });
    } catch (err) {
      next(err);
    }
  },

  async getMyRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const type = (req.query.type as 'made' | 'volunteered') ?? 'made';
      const requests = await requestService.getMyRequests(req.user.id, type);
      res.json({ success: true, data: requests });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const request = await requestService.create(req.user.id, req.body);
      res.status(201).json({ success: true, data: request });
    } catch (err) {
      next(err);
    }
  },

  async uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Handled by multer-s3 middleware; file URL available on req.file
      const file = (req as Request & { file?: { location: string } }).file;
      if (!file) throw new AppError('No file uploaded', 400);

      const { prisma } = await import('../config/database.js');
      const image = await prisma.requestImage.create({
        data: {
          requestId: req.params.id,
          url: file.location,
        },
      });

      res.status(201).json({ success: true, data: image });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const { prisma } = await import('../config/database.js');

      const request = await prisma.helpRequest.findFirst({
        where: { id: req.params.id, authorId: req.user.id, deletedAt: null },
      });
      if (!request) throw new AppError('Request not found', 404);
      if (request.status !== 'OPEN') throw new AppError('Cannot edit a non-open request', 400);

      const updated = await prisma.helpRequest.update({
        where: { id: req.params.id },
        data: {
          ...(req.body.title ? { title: req.body.title } : {}),
          ...(req.body.description ? { description: req.body.description } : {}),
          ...(req.body.urgency ? { urgency: req.body.urgency } : {}),
        },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      await requestService.cancel(req.params.id, req.user.id);
      res.json({ success: true, message: 'Request cancelled' });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const { prisma } = await import('../config/database.js');

      const request = await prisma.helpRequest.findFirst({
        where: { id: req.params.id, authorId: req.user.id, deletedAt: null },
      });
      if (!request) throw new AppError('Request not found', 404);

      // Soft delete
      await prisma.helpRequest.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date(), status: 'CANCELLED' },
      });

      res.json({ success: true, message: 'Request deleted' });
    } catch (err) {
      next(err);
    }
  },

  async report(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const { prisma } = await import('../config/database.js');

      await prisma.report.create({
        data: {
          authorId: req.user.id,
          reportedRequestId: req.params.id,
          reason: req.body.reason,
          description: req.body.description ?? '',
        },
      });

      res.json({ success: true, message: 'Report submitted' });
    } catch (err) {
      next(err);
    }
  },
};
