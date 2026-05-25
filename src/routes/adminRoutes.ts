import { Router } from "express";
import { deleteUser, getAllPropertiesAdmin, getAllUsers, getDashboardStats, setFeaturedProperties, updatePropertyStatus } from "../controllers/adminController";
import { authenticateJWT, authorizeRoles } from "../middleware/auth-middleware";
import { validateRequest } from "../middleware/validate-request";
import { featuredPropertiesSchema, updatePropertyStatusSchema } from "../utils/validate-schema";

const router = Router();

router.get("/stats",
    authenticateJWT,
    authorizeRoles("admin"),
    getDashboardStats);

router.get("/users",
    authenticateJWT,
    authorizeRoles("admin"),
    getAllUsers);

router.delete("/users/:id",
    authenticateJWT,
    authorizeRoles("admin"),
    deleteUser);

router.get(
    "/properties",
    authenticateJWT,
    authorizeRoles("admin"),
    getAllPropertiesAdmin
);

router.patch(
    "/properties/:id/status",
    authenticateJWT,
    authorizeRoles("admin"),
    validateRequest({ body: updatePropertyStatusSchema }),
    updatePropertyStatus,
);

router.put(
    "/featured-properties",
    authenticateJWT,
    authorizeRoles("admin"),
    validateRequest({ body: featuredPropertiesSchema }),
    setFeaturedProperties,
);

export default router;
