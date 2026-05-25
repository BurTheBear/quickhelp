import { Request, Response, NextFunction } from 'express';
export declare const leaderboardController: {
    getGlobal(req: Request, res: Response, next: NextFunction): Promise<void>;
    getWeekly(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMonthly(req: Request, res: Response, next: NextFunction): Promise<void>;
    getNearby(req: Request, res: Response, next: NextFunction): Promise<void>;
    getChallenges(_req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=leaderboard.controller.d.ts.map