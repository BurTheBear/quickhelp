import { Request, Response, NextFunction } from 'express';
export declare const requestController: {
    getFeed(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMapRequests(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMyRequests(req: Request, res: Response, next: NextFunction): Promise<void>;
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    uploadImage(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    cancel(req: Request, res: Response, next: NextFunction): Promise<void>;
    remove(req: Request, res: Response, next: NextFunction): Promise<void>;
    report(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=request.controller.d.ts.map