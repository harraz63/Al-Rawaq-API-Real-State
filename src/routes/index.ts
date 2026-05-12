

import express from "express";
import authRoutes from "./auth";
import propertyRoutes from "./property";
import adminRoutes from "./adminRoutes";



const router = express.Router();

router.use("/auth", authRoutes);
router.use("/property", propertyRoutes);
router.use("/admin", adminRoutes);


export default router;