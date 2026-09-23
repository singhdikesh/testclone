import type {NextFunction, Request, Response} from "express";
import { db } from "../prisma/db.ts";
import { BadRequestException } from "../exception/badRequest.ts";
import { ErrorCodes } from "../exception/HttpException.ts";



export const getBookmark = async(req: Request, res: Response, next: NextFunction) => {

    const {userId} = req.body;
    if(!userId){
        return next(new BadRequestException("User ID is required", ErrorCodes.MISSING_REQUIRED_FIELDS));
    }

    const bookmarks = await db.orm.public.Bookmark.where({userId}).all();

    return res.status(200).json({
        success: true,
        message: "Bookmarks fetched successfully",
        data: bookmarks
    })
}

export const createBookmark = async(req: Request, res: Response, next: NextFunction) => {
    
    const {userId, postId} = req.body;
    
    const post = await db.orm.public.Post.where({id: postId}).first();

    if(!post){
        return next(new BadRequestException("Post not found.", ErrorCodes.POST_NOT_FOUND));
    }

    const existingBookmark = await db.orm.public.Bookmark.where({userId, postId}).first();

    if(existingBookmark){
        await db.orm.public.Bookmark.where({id: existingBookmark.id}).delete();
        return res.status(200).json({
            success: true,
            bookmarked: false,
            message: "Bookmark removed successfully"
        });
    }

    const bookmark = await db.orm.public.Bookmark.create({userId, postId});

    return res.status(201).json({
        success: true,
        message: "Post bookmarked successfully",
        bookmarked: true,
        data: bookmark
    })
    
}


export const removeBookmark = async(req: Request<{id: string}>, res: Response, next: NextFunction) => {
    const {id} = req.params;

    const bookmark = await db.orm.public.Bookmark.where({id}).first();

    if(!bookmark){
        return next(new BadRequestException("Bookmark not found.", ErrorCodes.POST_NOT_FOUND));
    }

    await db.orm.public.Bookmark.where({id}).delete();

    return res.status(200).json({
        success: true,
        message: "Bookmarked removed successfully"
    });
    
}
