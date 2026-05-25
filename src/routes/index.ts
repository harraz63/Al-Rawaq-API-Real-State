import express from "express";
import authRoutes from "./auth";
import propertyRoutes from "./property";
import adminRoutes from "./adminRoutes";
import favoriteRoutes from "./favoriteRoutes";
import profileRoutes from "./profileRoutes";



const router = express.Router();

router.use("/auth", authRoutes);
router.use("/property", propertyRoutes);
router.use("/admin", adminRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/profile", profileRoutes);


export default router;
