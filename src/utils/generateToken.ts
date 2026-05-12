import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { config } from "../config/app-config";

export const generateJWTToken = (userId: string, purpose: string, role: string) => {
    const secret: Secret = config.JWT.SECRET as string;

    const token = jwt.sign(
        { userId, role, purpose },
        secret,
        {
            expiresIn: "1h", // ✅ نحولها لنص فقط
        } as SignOptions // 👈 نوضح إنها من نوع SignOptions علشان TS يسكت
    );


    return token;
};
