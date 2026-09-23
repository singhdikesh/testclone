import type {NextFunction, Request, Response} from "express";
import { db } from "../prisma/db.ts";
import { BadRequestException } from "../exception/badRequest.ts";
import { ErrorCodes } from "../exception/HttpException.ts";


export const follower = async(req: Request, res: Response, next: NextFunction) => {

    const {userId} = req.body;

    const followers = await db.orm.public.Follow.where({followingId: userId}).all();

    if(followers.length === 0){
        return next(new BadRequestException("No follower.", ErrorCodes.NO_FOLLOWER_FOUND));
    }

    return res.status(200).json({
        success: true,
        message: "Followers found.",
        data: followers
    });
}


export const unfollow = async(req: Request, res: Response, next: NextFunction) => {

    const {followerId, followingId} = req.body;
    
    const follow = await db.orm.public.Follow.where({followerId, followingId}).first();


    if(!follow){
        return next(new BadRequestException("Your are not following this user.", ErrorCodes.NO_FOLLOWER_FOUND));
    }

    await db.orm.public.Follow.where({id:  follow?.id}).delete();

    return res.status(200).json({
        success: true,
        message: "User unfollowed successfully."
    });

}

export const follow = async(req: Request, res: Response, next: NextFunction) => {

    const {followerId, followingId} = req.body;

    if(!followingId){
        return next(new BadRequestException("User to follow is required", ErrorCodes.MISSING_REQUIRED_FIELDS));
    }

    if(followerId === followingId){
        return next(new BadRequestException("You cannot follow yourself", ErrorCodes.INVALID_REQUEST));
    }

    const user = await db.orm.public.User.where({id: followingId}).first();

    if(!user){
        return next(new BadRequestException("User not found", ErrorCodes.USER_NOT_FOUND));
    }

    const existingFollow = await db.orm.public.Follow.where({followerId, followingId}).first();

    if(existingFollow){
        return next(new BadRequestException("You are already following this user.", ErrorCodes.ALREADY_FOLLOWING));
    }

    const newFollow = await db.orm.public.Follow.create({followerId, followingId});

    return res.status(201).json({
        success: true,
        message: "User followed successfully.",
        data: newFollow
    })
}

export const toggleFollow = async(req: Request, res: Response, next: NextFunction) => {
    const {followerId, followingId} = req.body;

    if(!followerId || !followingId){
        return next(new BadRequestException("Follower and following user are required", ErrorCodes.MISSING_REQUIRED_FIELDS));
    }

    if(followerId === followingId){
        return next(new BadRequestException("You cannot follow yourself", ErrorCodes.INVALID_REQUEST));
    }

    const user = await db.orm.public.User.where({id: followingId}).first();
    if(!user){
        return next(new BadRequestException("User not found", ErrorCodes.USER_NOT_FOUND));
    }

    const existingFollow = await db.orm.public.Follow.where({followerId, followingId}).first();

    if(existingFollow){
        await db.orm.public.Follow.where({id: existingFollow.id}).delete();
        return res.status(200).json({
            success: true,
            following: false,
            message: "User unfollowed successfully."
        });
    }

    const newFollow = await db.orm.public.Follow.create({followerId, followingId});
    return res.status(201).json({
        success: true,
        following: true,
        message: "User followed successfully.",
        data: newFollow
    });
}

export const getFollowingStatus = async(req: Request, res: Response, next: NextFunction) => {
    const {followerId} = req.body;
    if(!followerId){
        return next(new BadRequestException("Follower ID is required", ErrorCodes.MISSING_REQUIRED_FIELDS));
    }

    const follows = await db.orm.public.Follow.where({followerId}).all();
    return res.status(200).json({
        success: true,
        data: follows.map((follow) => follow.followingId)
    });
}