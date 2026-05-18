import jwt from "jsonwebtoken";
import { Response, NextFunction } from "express";
import User from "../models/User";
import { config } from "../config/app-config";

// ─── authenticate (cookie/header – loads full user document) ──────────────────
export const authenticate = async (req: any, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        req.user = user;
        req.userRole = decoded.role;
        next();
    } catch {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

// ─── authenticateJWT (lightweight – uses JWT payload only) ───────────────────
export const authenticateJWT = (req: any, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ success: false, message: "Not authenticated. Please log in." });
        }

        const decoded = jwt.verify(token, config.JWT.SECRET) as {
            userId?: string;
            role?: string;
            purpose?: string;
        };

        if (decoded.purpose !== "login" || !decoded.userId) {
            return res.status(401).json({ success: false, message: "Invalid access token" });
        }

        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

// ─── authorizeRoles (must run AFTER authenticateJWT or authenticate) ──────────
/**
 * Returns 401 if req.user is not set (auth middleware was not applied).
 * Returns 403 if the authenticated user's role is not in allowedRoles.
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: any, res: Response, next: NextFunction) => {
        if (!req.user) {
            // Should not reach here if authenticateJWT is applied first,
            // but guard against middleware ordering mistakes.
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const role: string | undefined = req.user.role;

        if (!role || !allowedRoles.includes(role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Requires one of: [${allowedRoles.join(", ")}]`,
            });
        }

        next();
    };
};
