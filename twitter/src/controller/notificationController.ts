import type {NextFunction, Request, Response} from "express";
import { db } from "../prisma/db.ts";
import { BadRequestException } from "../exception/badRequest.ts";
import { ErrorCodes } from "../exception/HttpException.ts";


export const createNotification = async(req: Request, res: Response, next: NextFunction) => {
    const {userId, actorId, postId, type} = req.body;

    if(!userId || !actorId || !postId){
        return next(new BadRequestException("User, actor and post are required", ErrorCodes.MISSING_REQUIRED_FIELDS));
    }

    const notification = await db.orm.public.Notification.create({
        userId,
        actorId,
        postId,
        type: type ?? "POST"
    });

    return res.status(201).json({
        success: true,
        message: "Notification created successfully",
        data: notification
    });
}

export const getNotification = async(req: Request, res: Response, next: NextFunction) => {

    const userId = typeof req.query.userId === "string" ? req.query.userId : req.body?.userId;

    if(!userId){
        return next(new BadRequestException("User ID is required", ErrorCodes.MISSING_REQUIRED_FIELDS));
    }

    const notifications = (await db.orm.public.Notification.where({userId}).all())
        .filter((notification) => notification.type === "POST")
        .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());
    const enriched = await Promise.all(notifications.map(async (notification) => {
        const [actor, post] = await Promise.all([
            notification.actorId ? db.orm.public.User.where({id: notification.actorId}).first() : null,
            notification.postId ? db.orm.public.Post.where({id: notification.postId}).first() : null,
        ]);

        return {
            ...notification,
            actor,
            post,
        };
    }));

    return res.status(200).json({
        success: true,
        message: "Notifications retrieved successfully",
        data: enriched
    });
}

export const markNotificationAsRead = async(req: Request<{id: string}>, res: Response, next: NextFunction)=> {

    const {id} = req.params;

    if(!id){
        return next(new BadRequestException("Notification ID is required", ErrorCodes.MISSING_REQUIRED_FIELDS));
    }

    const notification = await db.orm.public.Notification.where({id}).first();

    if(!notification){
        return next(new BadRequestException("Notification not found", ErrorCodes.INVALID_REQUEST));
    }

    const updatedNotification = await db.orm.public.Notification.where({id}).update({
        readAt: new Date()
    });

    return res.status(200).json({
        success: true,
        message: "Notification marked as read",
        data: updatedNotification
    });
};