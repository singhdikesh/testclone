import type {Request, Response, NextFunction} from "express";
import { verifyAcessToken } from "../utils/jwt";
import { BadRequestException } from "../exception/badRequest";
import { ErrorCodes } from "../exception/HttpException";


export const authenticateUser = (req: Request, res: Response, next: NextFunction) => {

    const authHeader = req.headers.authorization;

    if(!authHeader){
        return next(new BadRequestException("Autthentication required", ErrorCodes.UNAUTHORIZED));
    }

    if(!authHeader.startsWith("Bearer ")){
        return next(new BadRequestException("Invalide authorization format", ErrorCodes.UNAUTHORIZED));
    }

    const token = authHeader.split(" ")[1];

    if(!token){
        return next(new BadRequestException("Token missing", ErrorCodes.UNAUTHORIZED));
    }

    const decoded = verifyAcessToken(token);

    req.user = {id: decoded.userId}
    next();
}