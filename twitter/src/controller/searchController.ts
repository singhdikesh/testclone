import type {NextFunction, Request, Response} from "express";
import { or } from "@prisma/orm-postgres/orm-client";
import { db } from "../prisma/db.ts";
import { BadRequestException } from "../exception/badRequest.ts";
import { ErrorCodes } from "../exception/HttpException.ts";


export const search = async (req: Request, res: Response, next: NextFunction) => {
    
    const search = String(req.query.searchQuery ?? "").trim();

    if(!search){
        return next(new BadRequestException("Search query is required", ErrorCodes.MISSING_REQUIRED_FIELDS));
    }

    const users = await db.orm.public.User.where(u => or (u.name.ilike(`%${search}%`), u.username.ilike(`%${search}%`))).all();

    return res.status(200).json({
        success: true,
        message: "Search results fetched successfully",
        data: users
    })

}

// export const content = async(req: Request, res: Response, next: NextFunction) => {

//     const search = String(req.query.searchQuery ?? "").trim();

//     if(!search) return next(new BadRequestException("Input is required", ErrorCodes.MISSING_REQUIRED_FIELDS));

//     const content = await db.orm.public.Post.where
// }
