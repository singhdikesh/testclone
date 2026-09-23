import type {Request, Response, NextFunction } from "express";
import { or } from "@prisma/orm-postgres/orm-client";
import bcrypt from "bcrypt";
import {db} from "../prisma/db"
import { BadRequestException } from "../exception/badRequest";
import { ErrorCodes } from "../exception/HttpException";
import { generateAccessToken } from "../utils/jwt";


export const login = async(req: Request, res: Response, next: NextFunction) => {

    const {username, email, password} = req.body;

    if((!username && !email) || !password){
        return next(new BadRequestException("Email or username and password are required", ErrorCodes.MISSING_REQUIRED_FIELDS));
    }

    const normalizedEmail = email?.toLowerCase().trim();

    const user = await db.orm.public.User.where((u) => or(u.email.eq(normalizedEmail), u.username.eq(username))).first();

    if(!user){
        return next(new BadRequestException("Invalid credentials.", ErrorCodes.INVALID_CREDENTIALS));
    }

    if (!user.password) {
        return next(new BadRequestException("This account uses Google login", ErrorCodes.INVALID_CREDENTIALS));
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if(!passwordMatch){
        return next(new BadRequestException("Invalid email or password", ErrorCodes.INVALID_CREDENTIALS));
    }

    if(!user.isActive){
        return next(new BadRequestException("Accont is inactive", ErrorCodes.UNAUTHORIZED));
    }

    if(!user.emailVerified){
        return next(new BadRequestException("Please very your email before logging in", ErrorCodes.UNAUTHORIZED));
    }

    const token = generateAccessToken(user.id, user.username);

    return res.status(200).json({
        success: true,
        message: "Login successful.",
        data: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            token
        }
    });
}