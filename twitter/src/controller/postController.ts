import type {NextFunction, Request, Response} from "express";
import { db } from "../prisma/db.ts";
import { BadRequestException } from "../exception/badRequest.ts";
import { ErrorCodes } from "../exception/HttpException.ts";
import {and} from "@prisma/orm-postgres/orm-client";

export const getAllPosts = async (req: Request<{id: string}>, res: Response) => {
    const {id} = req.params;
    const {postId, userId} = req.body;

    const posts = await db.orm.public.Post.where({authorId: id}).all();

    const existingView = await db.orm.public.PostView.where((view)=>
        and(
            view.postId.eq(postId),
            view.userId.eq(userId)
        )
    ).first();


    const viewCount = await db.orm.public.PostView.where((view)=> view.postId.eq(postId)).count();

    const media = await db.orm.public.PostMedia.where((media)=> media.postId.eq(postId)).all();

    if(!existingView){
        await db.orm.public.PostView.create({
            postId,
            userId
        });
    }

    return res.status(200).json({
        success: true, 
        data: posts,
        media,
        viewCount
    });
}

export const updatePostById = async(req: Request<{id: string}>, res: Response, next: NextFunction) => {
    const {id} = req.params;

    const {content} = req.body;

    if(content == undefined){
        return next(new BadRequestException("Content is rquired", ErrorCodes.MISSING_REQUIRED_FIELDS));
    }

    const post = await db.orm.public.Post.where({id}).first();

    if(!post){
        return next(new BadRequestException("Post not found", ErrorCodes.POST_NOT_FOUND))
    }

    const updatedFields: Record<string, string> = {};

    if (content !== undefined) {
        updatedFields.content = content;
    }

   const updatedPost = await db.orm.public.Post.where({id}).update(updatedFields);

   return res.json(200).json({
        success: true,
        message: "user udpated successfully",
        data: updatedPost
   });
}

export const deletePostById = async(req: Request<{id: string}>, res: Response, next: NextFunction) => {
    const {id} = req.params;

    const post = await db.orm.public.Post.where({id}).first();

    if(!post){
        return next(new BadRequestException("Post not found", ErrorCodes.POST_NOT_FOUND));
    }

    await db.orm.public.Post.where({id}).delete();

    return res.status(200).json({
        success: true,
        message: "Post successfully deleted."
    });
}

export const createPost = async(req: Request, res: Response, next: NextFunction) => {
    const {content, authorId} = req.body;
    const file = req.file;

    if(!content || content.trim().length === 0){
        return next(new BadRequestException("Content missing", ErrorCodes.MISSING_REQUIRED_FIELDS))
    }

    let mediaType: "IMAGE" | "VIDEO" | null = null;

    if(file){
        if(file.mimetype.startsWith("image/")){
            mediaType = "IMAGE";
        }else if(file.mimetype.startsWith("video/")){
            mediaType = "VIDEO";
        }
    }

    const newPost = await db.orm.public.Post.create({
        content: content.trim(),
        authorId,
    });

    let media = null;

    if(file && mediaType){
        const mediaUrl = `/uploads/posts/${file.filename}`;

        media = await db.orm.public.PostMedia.create({
            postId: newPost.id,
            userId: newPost.id,
            url: mediaUrl,
            type: mediaType
        });
    }

    try {
        const followers = await db.orm.public.Follow.where({followingId: authorId}).all();

        await Promise.all(followers.map(async (follow) => {
            await db.orm.public.Notification.create({
                userId: follow.followerId,
                actorId: authorId,
                postId: newPost.id,
                type: "POST",
            });
        }));
    } catch (notificationError) {
        console.error("Post created, but notifications could not be saved:", notificationError);
    }

    return res.status(201).json({
        success: true,
        message: "New post created successfully",
        data: newPost
    })
}

export const getFeed = async (req: Request, res: Response) => {
    const allPosts = await db.orm.public.Post.all();
    const posts = allPosts.filter((post) => !post.parentId);
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;

    const feed = await Promise.all(posts.map(async (post) => {
        const [author, likes, reposts, bookmarks, replies] = await Promise.all([
            db.orm.public.User.where({id: post.authorId}).first(),
            db.orm.public.Like.where({postId: post.id}).all(),
            db.orm.public.Repost.where({postId: post.id}).all(),
            db.orm.public.Bookmark.where({postId: post.id}).all(),
            db.orm.public.Post.where({parentId: post.id}).all(),
        ]);

        return {
            ...post,
            author: author ? { id: author.id, name: author.name, username: author.username, avatar: author.avatar } : null,
            likesCount: likes.length,
            repostsCount: reposts.length,
            bookmarksCount: bookmarks.length,
            repliesCount: replies.length,
            liked: userId ? likes.some((like) => like.userId === userId) : false,
            reposted: userId ? reposts.some((repost) => repost.userId === userId) : false,
            bookmarked: userId ? bookmarks.some((bookmark) => bookmark.userId === userId) : false,
        };
    }));

    return res.status(200).json({
        success: true,
        data: feed
    });
}

export const createReply = async(req: Request<{id: string}>, res: Response, next: NextFunction) => {
    const {id} = req.params;
    const {content, authorId} = req.body;

    if(!content?.trim() || !authorId){
        return next(new BadRequestException("Reply content and author are required", ErrorCodes.MISSING_REQUIRED_FIELDS));
    }

    const parent = await db.orm.public.Post.where({id}).first();
    if(!parent){
        return next(new BadRequestException("Post not found", ErrorCodes.POST_NOT_FOUND));
    }

    const reply = await db.orm.public.Post.create({content: content.trim(), authorId, parentId: id});
    return res.status(201).json({success: true, message: "Reply posted successfully", data: reply});
}