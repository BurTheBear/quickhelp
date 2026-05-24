import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestId = (_req: Request, res: Response, next: NextFunction): void => {
  const id = uuidv4();
  _req.headers['x-request-id'] = id;
  res.setHeader('X-Request-ID', id);
  next();
};
