import type { Request, Response, NextFunction } from 'express';
import { HttpException } from '../exception/HttpException';

export const errorMiddleware = (error: unknown, req: Request, res: Response, next: NextFunction) => {
    console.error(`Request failed: ${req.method} ${req.originalUrl}`, error);
    
    if(error instanceof HttpException) {
        return res.status(error.statusCode).json({
            message: error.message,
            errorCode: error.errorCode,
            error: error.error
        });
    }

    return res.status(500).json({
        message: process.env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : error instanceof Error ? error.message : 'Internal Server Error'
    });
}
