import type {NextFunction, Request, Response} from "express";
import { db } from "../prisma/db.ts";
import { BadRequestException } from "../exception/badRequest.ts";
import { ErrorCodes } from "../exception/HttpException.ts";


export const repost = async(req: Request, res: Response, next: NextFunction) => {

    const {userId, postId} = req.body

    const post = await db.orm.public.Post.where({id: postId}).first();

    if(!post) return next(new BadRequestException("Post not found", ErrorCodes.POST_NOT_FOUND));

    const existingRepost = await db.orm.public.Repost.where({userId, postId}).first();

    if(existingRepost){
        await db.orm.public.Repost.where({userId, postId}).delete();

        return res.status(200).json({
            success: false,
            reposted: false,
            message: "Repost removed successfully"
        });
    }

    const repost = await db.orm.public.Repost.create({userId, postId});

    return res.status(201).json({
        success: true,
        reposted: true,
        message: "Post reposted successfully",
        data: repost
    });
}