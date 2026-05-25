import { Request, Response, NextFunction } from 'express';
export declare const matchController: {
    acceptRequest(req: Request, res: Response, next: NextFunction): Promise<void>;
    startTask(req: Request, res: Response, next: NextFunction): Promise<void>;
    completeTask(req: Request, res: Response, next: NextFunction): Promise<void>;
    requestCompletion(req: Request, res: Response, next: NextFunction): Promise<void>;
    approveCompletion(req: Request, res: Response, next: NextFunction): Promise<void>;
    cancelMatch(req: Request, res: Response, next: NextFunction): Promise<void>;
    getActiveMatches(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMatchHistory(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=match.controller.d.ts.map