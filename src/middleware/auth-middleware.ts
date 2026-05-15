import jwt from "jsonwebtoken";
import { Response, NextFunction } from "express";
import User from "../models/User";
import { config } from "../config/app-config";

// ✅ يتحقق إن المستخدم عامل تسجيل دخول
export const authenticate = async (req: any, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "No token provided" });

        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        req.user = user;
        req.userRole = decoded.role;
        next();
    } catch (error: any) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};

// ✅ يتحقق من صلاحيات المستخدم (role)
export const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: any, res: Response, next: NextFunction) => {
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }
        next();
    };
};


export const authenticateJWT = (req: any, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const decoded = jwt.verify(token, config.JWT.SECRET) as {
            userId?: string;
            role?: string;
            purpose?: string;
        };

        if (decoded.purpose !== "login" || !decoded.userId) {
            return res.status(401).json({ message: "Invalid access token" });
        }

        req.user = decoded;

        next();
    } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};
