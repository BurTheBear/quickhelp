import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    message: string;
    statusCode: number;
    isOperational: boolean;
    details?: unknown | undefined;
    constructor(message: string, statusCode?: number, isOperational?: boolean, details?: unknown | undefined);
}
export declare const errorHandler: (err: Error, req: Request, res: Response, _next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map