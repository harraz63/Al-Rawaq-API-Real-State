import jwt from "jsonwebtoken";
import { Response, NextFunction } from "express";
import User from "../models/User";
import { config } from "../config/app-config";
import { errorResponse } from "../utils/api-response";

export const authenticate = async (req: any, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
        if (!token) {
            return errorResponse(res, 401, "No token provided", null);
        }

        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const user = await User.findById(decoded.id);
        if (!user) {
            return errorResponse(res, 401, "User not found", null);
        }

        req.user = user;
        req.userRole = decoded.role;
        next();
    } catch {
        return errorResponse(res, 401, "Invalid or expired token", null);
    }
};

export const authenticateJWT = (req: any, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

        if (!token) {
            return errorResponse(res, 401, "Not authenticated. Please log in.", null);
        }

        const decoded = jwt.verify(token, config.JWT.SECRET) as {
            userId?: string;
            role?: string;
            purpose?: string;
        };

        if (decoded.purpose !== "login" || !decoded.userId) {
            return errorResponse(res, 401, "Invalid access token", null);
        }

        req.user = decoded;
        next();
    } catch {
        return errorResponse(res, 401, "Invalid or expired token", null);
    }
};

export const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: any, res: Response, next: NextFunction) => {
        if (!req.user) {
            return errorResponse(res, 401, "Not authenticated", null);
        }

        const role: string | undefined = req.user.role;

        if (!role || !allowedRoles.includes(role)) {
            return errorResponse(
                res,
                403,
                `Access denied. Requires one of: [${allowedRoles.join(", ")}]`,
                null,
            );
        }

        next();
    };
};
