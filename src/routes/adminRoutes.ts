import { Router } from "express";
import { getAllPropertiesAdmin, getAllUsers, getDashboardStats } from "../controllers/adminController";
import { authenticateJWT, authorizeRoles } from "../middleware/auth-middleware";

const router = Router();

// حماية API بصلاحيات Admin
router.get("/stats",
    authenticateJWT,
    authorizeRoles("admin"),
    getDashboardStats);

router.get("/users",
    authenticateJWT,
    authorizeRoles("admin"),
    getAllUsers);

router.get(
    "/properties",
    authenticateJWT,
    authorizeRoles("admin"),
    getAllPropertiesAdmin
);


export default router;
