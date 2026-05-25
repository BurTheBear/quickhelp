import { Request, Response, NextFunction } from 'express';
export declare const adminController: {
    getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void>;
    listUsers(req: Request, res: Response, next: NextFunction): Promise<void>;
    getUserDetail(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteUser(req: Request, res: Response, next: NextFunction): Promise<void>;
    listRequests(req: Request, res: Response, next: NextFunction): Promise<void>;
    flagRequest(req: Request, res: Response, next: NextFunction): Promise<void>;
    unflagRequest(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteRequest(req: Request, res: Response, next: NextFunction): Promise<void>;
    listReports(req: Request, res: Response, next: NextFunction): Promise<void>;
    getReport(req: Request, res: Response, next: NextFunction): Promise<void>;
    resolveReport(req: Request, res: Response, next: NextFunction): Promise<void>;
    dismissReport(req: Request, res: Response, next: NextFunction): Promise<void>;
    getFlaggedContent(req: Request, res: Response, next: NextFunction): Promise<void>;
    listBadges(_req: Request, res: Response, next: NextFunction): Promise<void>;
    createBadge(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateBadge(req: Request, res: Response, next: NextFunction): Promise<void>;
    listChallenges(_req: Request, res: Response, next: NextFunction): Promise<void>;
    createChallenge(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateChallenge(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=admin.controller.d.ts.map