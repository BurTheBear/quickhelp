import { Request, Response, NextFunction } from 'express';
export declare const userController: {
    getProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMyStats(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMyBadges(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMyAchievements(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
    uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateLocation(req: Request, res: Response, next: NextFunction): Promise<void>;
    registerDeviceToken(req: Request, res: Response, next: NextFunction): Promise<void>;
    removeDeviceToken(req: Request, res: Response, next: NextFunction): Promise<void>;
    rateUser(req: Request, res: Response, next: NextFunction): Promise<void>;
    reportUser(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=user.controller.d.ts.map