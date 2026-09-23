import type {NextFunction, Request, Response} from "express";
import { db } from "../prisma/db.ts";
import { BadRequestException } from "../exception/badRequest.ts";
import { ErrorCodes } from "../exception/HttpException.ts";

export const likePost = async(req:Request, res: Response, next: NextFunction) => {

    const {userId, postId} = req.body;

    const post = await db.orm.public.Post.where({id: postId}).first();

    if(!post) return next(new BadRequestException("Post not found", ErrorCodes.POST_NOT_FOUND));

    const existingLike = await db.orm.public.Like.where({userId, postId}).first();

    if(existingLike){
        await db.orm.public.Like.where({userId, postId}).delete();

        return res.status(200).json({
            success: true,
            liked: false,
            message: "Post unliked successfully"
        });
    }

    const like = await db.orm.public.Like.create({
        userId,
        postId
    });

    return res.status(201).json({
        success: true,
        liked: true,
        message: "Post liked successfully",
        data: like
    });

}

export const getLikes = async(req: Request, res: Response) => {

    const {userId, postId} = req.body;

    const likes = await db.orm.public.Like.where({postId}).aggregate((c) => ({totalLike: c.count()}));

    return res.status(200).json({
        success: true,
        data: likes
    });

}