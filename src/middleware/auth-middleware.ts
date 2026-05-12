import jwt from "jsonwebtoken";
import {  Response, NextFunction } from "express";
import User from "../models/User";

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
        // 1️⃣ جلب التوكن من cookies أو Authorization header
        const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        // 2️⃣ التحقق من التوكن وفك تشفيره
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);

        // 3️⃣ إضافة بيانات اليوزر للـ request
        req.user = decoded;

        next(); // مواصلة التنفيذ
    } catch (error: any) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};
