import { Request, Response, NextFunction } from 'express';
export declare const groupController: {
    list(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    join(req: Request, res: Response, next: NextFunction): Promise<void>;
    leave(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMembers(req: Request, res: Response, next: NextFunction): Promise<void>;
};
//# sourceMappingURL=group.controller.d.ts.map