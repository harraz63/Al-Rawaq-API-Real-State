import { Request, Response } from "express";

import { config } from "../config/app-config";
import { getArcjet } from "../utils/arcjet";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/User";
import Verification from "../models/verification";
import { generateJWTToken } from "../utils/generateToken";
import { issueAuthTokens, setAuthCookies } from "../utils/auth-tokens";
import { sendEmailVerification } from "../utils/send-email-nodEmailer";

const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const aj = await getArcjet();
    const decision = await aj.protect(req, { email, requested: 1 } as any);
    console.log("Arcjet decision", decision);

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return res
          .status(429)
          .json({ message: "Too many requests, try again later." });
      }

      if (decision.reason.isEmail()) {
        return res
          .status(400)
          .json({ message: "Invalid or disposable email address." });
      }

      return res.status(403).json({ message: "Request blocked by Arcjet." });
    }

    const existUser = await User.findOne({ email });
    if (existUser) {
      return res.status(400).json({
        message: "Email address already in use",
      });
    }
    const userCreated = await User.create({
      name,
      email,
      password,
      role: "buyer",
    });

    const token = generateJWTToken(
      userCreated.id,
      "email-verification",
      userCreated.role,
    );

    await Verification.create({
      userId: userCreated.id,
      token,
      expiresAt: Date.now() + 1 * 60 * 60 * 1000,
    });

    const verificationLink = `${config.APP_ORIGIN}/auth/verify-email?token=${token}`;
    const emailSubject = "Verify your email";
    const isEmailSent = await sendEmailVerification(
      email,
      emailSubject,
      verificationLink,
      name,
    );

    if (!isEmailSent) {
      return res.status(500).json({
        message: "Failed to send verification email",
      });
    }

    res.status(201).json({
      message:
        "Verification email sent to your email. Please check and verify your account.",
      user: {
        ...userCreated.toObject(),
        password: undefined,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({
        message: error.message,
      });
    }
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (user.isGoogleUser) {
      return res.status(400).json({
        message:
          "هذا الحساب مسجّل بواسطة Google. من فضلك سجّل الدخول باستخدام Google.",
      });
    }

    if (!user.isEmailVerified) {
      const existingVerification = await Verification.findOne({
        userId: user._id,
      });

      if (existingVerification && existingVerification.expiresAt > new Date()) {
        return res.status(400).json({
          message:
            "Email not verified. Please check your email for the verification link.",
        });
      } else {
        await Verification.findByIdAndDelete(existingVerification?.id);
        const newToken = generateJWTToken(
          user.id,
          "email-verification",
          user.role,
        );
        await Verification.create({
          userId: user.id,
          token: newToken,
          expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        });

        const verificationLink = `${config.APP_ORIGIN}/auth/verify-email?token=${newToken}`;
        const emailSubject = "Verify your email";
        const isEmailSent = await sendEmailVerification(
          email,
          emailSubject,
          verificationLink,
          "بك",
        );

        if (!isEmailSent) {
          return res.status(500).json({
            message: "Failed to send verification email",
          });
        }
        return res.status(201).json({
          message:
            "Verification email sent to your email. Please check and verify your account.",
        });
      }
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const { accessToken, refreshToken } = await issueAuthTokens(user);
    setAuthCookies(res, accessToken, refreshToken);

    user.lastLogin = new Date();
    await user.save();

    const { password: _password, ...safeUser } = user.toObject();

    return res.status(200).json({
      message: "Login successful",
      user: safeUser,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({
        message: error.message,
      });
    }
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    const payload = jwt.verify(token, config.JWT.SECRET);

    if (!payload) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { userId, purpose } = payload as JwtPayload & {
      userId?: string;
      purpose?: string;
    };
    if (purpose !== "email-verification") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const verification = await Verification.findOne({
      userId,
      token,
    });

    if (!verification) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isExpired = verification.expiresAt.getTime() < Date.now();
    if (isExpired) {
      return res.status(401).json({ message: "Token expired" });
    }

    user.isEmailVerified = true;
    await user.save();

    await Verification.findByIdAndDelete(verification._id);
    res.cookie("token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password: safePassword, ...safeUser } = user.toObject();

    res.status(200).json({
      message: "Email verified successfully",
      user: safeUser,
    });
  } catch (err) {
    if (err instanceof Error) {
      console.log("error verifying email", err);
      res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

const resetPasswordRequest = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.isEmailVerified) {
      return res
        .status(400)
        .json({ message: "Please verify your email first" });
    }
    const existingVerification = await Verification.findOne({
      userId: user.id,
    });
    if (existingVerification && existingVerification.expiresAt > new Date()) {
      return res.status(400).json({
        message: "Reset password request already sent",
      });
    }
    if (existingVerification && existingVerification.expiresAt < new Date()) {
      await Verification.findByIdAndDelete(existingVerification.id);
    }

    const resetPasswordToken = generateJWTToken(
      user.id,
      "reset-password",
      user.role,
    );

    await Verification.create({
      userId: user.id,
      token: resetPasswordToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const resetPasswordLink = `${config.APP_ORIGIN}/auth/reset-password?token=${resetPasswordToken}`;
    const emailSubject = "Reset your password";

    const isEmailSent = await sendEmailVerification(
      email,
      emailSubject,
      resetPasswordLink,
      user.name,
    );

    if (!isEmailSent) {
      return res.status(500).json({
        message: "Failed to send reset password email",
      });
    }

    res.status(200).json({ message: "Reset password email sent" });
  } catch (err) {
    if (err instanceof Error) {
      console.log("error resetting password", err);
      res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

const verifyResetPasswordTokenAndResetPassword = async (
  req: Request,
  res: Response,
) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    const payload = jwt.verify(token, config.JWT.SECRET) as JwtPayload & {
      userId?: string;
      purpose?: string;
    };

    if (!payload) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { userId, purpose } = payload;

    if (purpose !== "reset-password") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const verification = await Verification.findOne({
      userId,
      token,
    });

    if (!verification) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isTokenExpired = verification.expiresAt < new Date();

    if (isTokenExpired) {
      return res.status(401).json({ message: "Token expired" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    user.password = newPassword;
    await user.save();

    await Verification.findByIdAndDelete(verification.id);

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    if (err instanceof Error) {
      console.log("error resetting password", err);
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const refreshToken =
      req.body.refreshToken ||
      req.cookies?.refreshToken ||
      req.headers.authorization?.split(" ")[1];

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is required" });
    }

    const payload = jwt.verify(
      refreshToken,
      config.JWT.REFRESH_SECRET,
    ) as JwtPayload & { userId?: string; purpose?: string };

    if (payload.purpose !== "refresh" || !payload.userId) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const storedToken = await Verification.findOne({
      userId: payload.userId,
      token: refreshToken,
      purpose: "refresh-token",
    });

    if (!storedToken || storedToken.expiresAt.getTime() < Date.now()) {
      return res.status(401).json({ message: "Refresh token expired or revoked" });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const tokens = await issueAuthTokens(user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return res.status(200).json({
      message: "Token refreshed successfully",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(401).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export {
  registerUser,
  loginUser,
  verifyEmail,
  resetPasswordRequest,
  verifyResetPasswordTokenAndResetPassword,
  refreshAccessToken,
};
