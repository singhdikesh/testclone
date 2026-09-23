import jwt from "jsonwebtoken"

interface JwtPayload{
    userId: string;
}

export const generateAccessToken = (userId: string, username: string) => {
 
    return jwt.sign(
        {
            userId,
            username,
        },
        process.env.JWT_SECRET!,
        {
            expiresIn: "7d",
        }
    );
}

export const verifyAcessToken = (token: string): JwtPayload => {
    return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
}