import type {NextFunction, Request, Response} from "express";
import { or } from "@prisma/orm-postgres/orm-client";
import bcrypt from "bcrypt";
import { Temporal } from "temporal-polyfill";
import { db } from "../prisma/db.ts";
import { BadRequestException } from "../exception/badRequest.ts";
import { ErrorCodes } from "../exception/HttpException.ts";
import { generateToken, hashToken } from "../utils/token.ts";
import { sendVerificationEmail } from "../utils/email.ts";


export const getAllUsers = async (req: Request, res: Response) => {
   const users = await db.orm.public.User.all();
   return res.status(200).json({ success: true, data: users });
}

export const getUserById = async (req: Request<{id: string}>, res: Response, next: NextFunction) => {
    const {id} = req.params;
    const user = await db.orm.public.User.where({id}).first();

    if(!user){
        return next(new BadRequestException("User not found", ErrorCodes.USER_NOT_FOUND));
    }

    return res.status(200).json({ success: true, data: user });
}

export const updateUserById = async (req: Request<{id: string}>, res: Response, next: NextFunction) => {
    const {id} = req.params;
    const {name, email, username, password, avatar, coverImage, bio} = req.body;

    const user = await db.orm.public.User.where({id}).first();

    if(!user){
        return next(new BadRequestException("User not found", ErrorCodes.USER_NOT_FOUND));
    }

    const updatedFields: Record<string, string> = {};
    
    if(name !== undefined) updatedFields.name = name;
    if(email !== undefined) updatedFields.email = email;
    if(username !== undefined) updatedFields.username = username;
    if(password !== undefined) updatedFields.password = await bcrypt.hash(password, 10);
    if(avatar !== undefined) updatedFields.avatar = avatar;
    if(coverImage !== undefined) updatedFields.coverImage = coverImage;
    if(bio !== undefined) updatedFields.bio = bio;


    if(Object.keys(updatedFields).length === 0) {
        return next(new BadRequestException("No fields to update", ErrorCodes.MISSING_REQUIRED_FIELDS));
    }

    const updatedUser = await db.orm.public.User.where({id}).update(updatedFields);

    return res.status(200).json({
        success: true, 
        message: "User updated successfully", 
        data: updatedUser
    });
}

export const deleteUserById = async (req: Request<{id: string}>, res: Response, next: NextFunction) => {
    const {id} = req.params;

    const user = await db.orm.public.User.where({id}).first();

    if(!user){
        return next(new BadRequestException("User not found", ErrorCodes.USER_NOT_FOUND));
    }

    await db.orm.public.User.where({id}).delete();

    return res.status(200).json({
        success: true, 
        message: "User deleted successfully"
    });
}

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    const {name, email, username, password, avatar, coverImage, bio} = req.body;

    if(!name || !email || !username || !password){
        return next(new BadRequestException("Missing required fields", ErrorCodes.MISSING_REQUIRED_FIELDS));
    }

    
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if(!emailRegex.test(normalizedEmail)){
        return next(new BadRequestException("Please provide a valid email address", ErrorCodes.INVALID_EMAIL));
    }


    const existingUser = await db.orm.public.User.where((user) => or(user.email.eq(normalizedEmail), user.username.eq(normalizedUsername))).first();

    if(existingUser){
        const isSameAccount = existingUser.email === normalizedEmail && existingUser.username === normalizedUsername;

        if(existingUser.emailVerified || !isSameAccount){
            return next(new BadRequestException("Email or username is already in use", ErrorCodes.USER_ALREADY_EXISTS));
        }

        await db.orm.public.EmailVerificationToken.where({userId: existingUser.id}).delete();
        await db.orm.public.User.where({id: existingUser.id}).update({
            name,
            password: await bcrypt.hash(password, 10),
            emailVerified: false,
            updatedAt: new Date().toISOString()
        });

        const verificationToken = generateToken();

        await db.orm.public.EmailVerificationToken.create({
            tokenHash: hashToken(verificationToken),
            userId: existingUser.id,
            expiresAt: Temporal.Instant.fromEpochMilliseconds(Date.now() + 15 * 60 * 1000)
        });

        await sendVerificationEmail({
            email: existingUser.email,
            username: existingUser.username,
            token: verificationToken
        });

        return res.status(201).json({
            success: true,
            message: "Verification email sent successfully",
            data: {
                id: existingUser.id,
                username: existingUser.username,
                name,
                email: existingUser.email
            }
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.orm.public.User.create({
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashedPassword,
        name,
        bio,
        avatar,
        coverImage,
        emailVerified: false,
        updatedAt: new Date().toISOString()
    });

    const verificationToken = generateToken();

    const tokenHash = hashToken(verificationToken);

    await db.orm.public.EmailVerificationToken.create({
        tokenHash,
        userId: newUser.id,
        expiresAt: Temporal.Instant.fromEpochMilliseconds(Date.now() + 15 * 60 * 1000)
    });

    try {
        await sendVerificationEmail({
            email: newUser.email,
            username: newUser.username,
            token: verificationToken
        });
    } catch (error) {
        await db.orm.public.EmailVerificationToken.where({userId: newUser.id}).delete();
        await db.orm.public.User.where({id: newUser.id}).delete();
        throw error;
    }

    return res.status(201).json({
        success: true, 
        message: "User created successfully", 
        data: {
            id: newUser.id,
            username: newUser.username,
            name: newUser.name,
            email: newUser.email
        }
    });
}