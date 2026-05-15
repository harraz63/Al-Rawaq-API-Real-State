import { Router } from "express";
import { getAllPropertiesAdmin, getAllUsers, getDashboardStats, setFeaturedProperties } from "../controllers/adminController";
import { authenticateJWT, authorizeRoles } from "../middleware/auth-middleware";
import { validateRequest } from "zod-express-middleware";
import { featuredPropertiesSchema } from "../utils/validate-schema";

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

router.put(
    "/featured-properties",
    authenticateJWT,
    authorizeRoles("admin"),
    validateRequest({ body: featuredPropertiesSchema }),
    setFeaturedProperties,
);

export default router;
