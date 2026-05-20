
import express from 'express'
import { loginUser, refreshAccessToken, registerUser, resetPasswordRequest, verifyEmail, verifyResetPasswordTokenAndResetPassword } from '../controllers/auth-controller'
import { emailSchema, loginSchema, refreshTokenSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from '../utils/validate-schema'
import { validateRequest } from '../middleware/validate-request'
import passport from 'passport'
import { config } from '../config/app-config'
import { IUser } from '../models/User'
import { issueAuthTokens, setAuthCookies } from '../utils/auth-tokens'

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
router.post("/refresh", validateRequest({
    body: refreshTokenSchema,
}), refreshAccessToken)
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
    passport.authenticate("google", {
        session: false,
        failureRedirect: `${config.APP_ORIGIN}/auth/login?error=google`,
    }),
    async (req: express.Request, res: express.Response) => {
        try {
            const user = req.user as IUser;
            if (!user) {
                return res.redirect(`${config.APP_ORIGIN}/auth/login?error=google`);
            }

            user.lastLogin = new Date();
            user.isEmailVerified = true;
            await user.save();

            const { accessToken, refreshToken } = await issueAuthTokens(user);
            setAuthCookies(res, accessToken, refreshToken);

            const { password: _password, ...safeUser } = user.toObject();
            const params = new URLSearchParams({
                accessToken,
                refreshToken,
                user: JSON.stringify(safeUser),
            });

            return res.redirect(`${config.APP_ORIGIN}/auth/success?${params.toString()}`);
        } catch (error) {
            console.error("Google callback error:", error);
            return res.redirect(`${config.APP_ORIGIN}/auth/login?error=google`);
        }
    }
);

export default router
