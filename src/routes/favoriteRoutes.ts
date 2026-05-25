import { Router } from "express";
import { authenticateJWT } from "../middleware/auth-middleware";
import {
    addToFavorites,
    getFavorites,
    removeFromFavorites,
} from "../controllers/favoriteController";

const router = Router();

router.post("/:propertyId", authenticateJWT, addToFavorites);
router.delete("/:propertyId", authenticateJWT, removeFromFavorites);
router.get("/", authenticateJWT, getFavorites);

export default router;
