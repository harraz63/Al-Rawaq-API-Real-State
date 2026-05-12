
import express from 'express'
import { loginUser, registerUser, resetPasswordRequest, verifyEmail, verifyResetPasswordTokenAndResetPassword } from '../controllers/auth-controller'
import { emailSchema, loginSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from '../utils/validate-schema'
import { validateRequest } from 'zod-express-middleware'
import { generateJWTToken } from '../utils/generateToken'
import passport from 'passport'
import { config } from '../config/app-config'
import User from '../models/User'

const router = express.Router();


router.post("/register",
    validateRequest({
        body: registerSchema,
    }), registerUser)
router.post("/verify-email",
    validateRequest({
        body: verifyEmailSchema,
    }), verifyEmail)
router.post("/login", validateRequest({
    body: loginSchema,
}), loginUser)
router.post("/forgot-password", validateRequest({
    body: emailSchema,
}), resetPasswordRequest)
router.post("/reset-password", validateRequest({
    body: resetPasswordSchema,
}), verifyResetPasswordTokenAndResetPassword)


router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/auth/login" }),
    async (req: any, res) => {

        let user = await User.findOne({ email: req.user.email });

        if (!user) {
            user = await User.create({
                name: req.user.displayName,
                email: req.user.email,
                profilePicture: req.user.photos?.[0]?.value,
                isGoogleUser: true,
                isEmailVerified: true,
                role: "buyer",
            });
        }

        // ✅ حدث تاريخ آخر تسجيل دخول
        user.lastLogin = new Date();
        user.isEmailVerified = true;
        await user.save();
        const token = generateJWTToken(req.user.id, "login" , user.role);

        res.cookie("token", token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        const { password, ...safeUser } = user.toObject();

        res.redirect(`${config.APP_ORIGIN}/auth/success?user=${encodeURIComponent(JSON.stringify(safeUser))}`);
    }
);

export default router