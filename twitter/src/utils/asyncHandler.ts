import type { RequestHandler } from 'express';

export const asyncHandler = <P = {}> (handler: RequestHandler <P>): RequestHandler<P> => {
    return (req, res, next) => {
        return Promise.resolve(handler(req, res, next)).catch(next);
    }
}