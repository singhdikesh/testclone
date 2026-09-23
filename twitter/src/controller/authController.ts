import type {Request, Response, NextFunction} from "express";
import { Temporal } from "temporal-polyfill";
import { OAuth2Client } from "google-auth-library";
import {db} from "../prisma/db";
import { BadRequestException } from "../exception/badRequest.ts";
import { ErrorCodes } from "../exception/HttpException.ts";
import { hashToken } from "../utils/token";
import { generateAccessToken } from "../utils/jwt.ts";


export const verifyEmail = async(req: Request, res: Response, next: NextFunction) => {
     const { token } = req.query;

        if (!token || typeof token !== "string") {

            return next(
                new BadRequestException(
                    "Verification token is required",
                    ErrorCodes.INVALID_TOKEN
                )
            );

        }

        const tokenHash = hashToken(token);

        const verificationToken = await db.orm.public.EmailVerificationToken.where((t) => t.tokenHash.eq(tokenHash)).first();


        if (!verificationToken) {

            return next(
                new BadRequestException(
                    "Invalid or expired verification token",
                    ErrorCodes.INVALID_TOKEN
                )
            );

        }

        const expiresAt = Temporal.Instant.from(verificationToken.expiresAt).epochMilliseconds;

        if (expiresAt <= Date.now()) {

            await db.orm.public.EmailVerificationToken
                .where((t) =>
                    t.id.eq(verificationToken.id)
                )
                .delete();


            return next(
                new BadRequestException(
                    "Verification link has expired",
                    ErrorCodes.INVALID_TOKEN
                )
            );

        }

        await db.orm.public.User
            .where((user) =>
                user.id.eq(
                    verificationToken.userId
                )
            )
            .update({

                emailVerified: true

            });


        await db.orm.public.EmailVerificationToken
            .where((t) =>
                t.id.eq(verificationToken.id)
            )
            .delete();


        return res.status(200).json({
            success: true,
            message:"Email verified successfully"
        });
}


export const googleLogin = async(req: Request, res: Response, next: NextFunction) => {
    
    try{

        
        const {credential} = req.body;

        if(!credential){
            return next(new BadRequestException("Google credentials is required", ErrorCodes.MISSING_REQUIRED_FIELDS));
        }

        if (!process.env.GOOGLE_CLIENT_ID) {
            return next(new Error("GOOGLE_CLIENT_ID is not configured. Restart the backend after adding it to twitter/.env."));
        }

        const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if(!payload){
            return next(new BadRequestException("Invalid Google Credentials", ErrorCodes.UNAUTHORIZED));
        }

        const {sub: googleId, email, email_verified, name, picture} = payload;

        if(!googleId || !email){
            return next(new BadRequestException("Google account information is incomplete", ErrorCodes.UNAUTHORIZED));
        }

        if(!email_verified){
            return next(new BadRequestException("Google email is not verified", ErrorCodes.UNAUTHORIZED));
        }

        let user = await db.orm.public.User.where((u)=> u.googleId.eq(googleId)).first();

        if(!user){
            user = await db.orm.public.User.where((u)=> u.email.eq(email)).first();
        }

        if(!user){
            const username = `user_${googleId.slice(-8)}`;

            user = await db.orm.public.User.create({
                username,
                email: email.toLowerCase(),
                password: null,
                googleId,
                name: name || username,
                avatar: picture || null,
                emailVerified: true,
                updatedAt: new Date().toISOString(),
            });
        }

        const userId = user.id;

        if(!user.googleId){
            user = await db.orm.public.User.where((u)=> u.id.eq(userId)).update({googleId, emailVerified: true});
        }

        if(!user?.isActive){
            return next(new BadRequestException("Account is inactive", ErrorCodes.UNAUTHORIZED));
        }

        const token = generateAccessToken(user.id, user.username);

        return res.status(200).json({
            success: true,
            message: "Google login successful",
            data: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                token,
            }
        });

    } catch (error) {
        console.error("Google Login Error:", error);
        return next(new BadRequestException("Google authentication failed. Check the Google client ID and authorized origin.", ErrorCodes.UNAUTHORIZED));
    }

 }