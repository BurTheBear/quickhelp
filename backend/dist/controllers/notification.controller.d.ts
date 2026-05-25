import { Request, Response, NextFunction } from 'express';
export declare const notificationController: {
    getNotifications(req: Request, res: Response, next: NextFunction): Promise<void>;
    getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void>;
    markRead(req: Request, res: Response, next: NextFunction): Promise<void>;
    markAllRead(req: Request, res: Response, next: NextFunction): Promise<void>;
    remove(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=notification.controller.d.ts.map