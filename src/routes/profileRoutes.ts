import { Router } from "express";
import { authenticateJWT } from "../middleware/auth-middleware";
import { upload } from "../middleware/upload";
import { validateRequest } from "../middleware/validate-request";
import {
    changeMyPassword,
    getMyProfile,
    updateMyProfile,
    updateMyProfilePicture,
} from "../controllers/profileController";
import {
    changePasswordSchema,
    updateProfileSchema,
} from "../utils/validate-schema";

const router = Router();

router.get("/me", authenticateJWT, getMyProfile);
router.patch(
    "/me",
    authenticateJWT,
    validateRequest({ body: updateProfileSchema }),
    updateMyProfile,
);
router.patch(
    "/me/picture",
    authenticateJWT,
    upload.single("profilePicture"),
    updateMyProfilePicture,
);
router.patch(
    "/me/password",
    authenticateJWT,
    validateRequest({ body: changePasswordSchema }),
    changeMyPassword,
);

export default router;
