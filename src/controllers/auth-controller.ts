import { Request, Response } from "express";

import { config } from "../config/app-config";
import { getArcjet } from "../utils/arcjet";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/User";
import Verification from "../models/verification";
import { generateJWTToken } from "../utils/generateToken";
import { issueAuthTokens, setAuthCookies } from "../utils/auth-tokens";
import { sendEmailVerification } from "../utils/send-email-nodEmailer";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../errors/app-error";
import { successResponse } from "../utils/api-response";

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const aj = await getArcjet();
  const decision = await aj.protect(req, { email, requested: 1 } as any);
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      throw new AppError("Too many requests, try again later.", 429);
    }

    if (decision.reason.isEmail()) {
      throw new AppError("Invalid or disposable email address.", 400);
    }

    throw new AppError("Request blocked by Arcjet.", 403);
  }

  const existUser = await User.findOne({ email });
  if (existUser) {
    throw new AppError("Email address already in use", 400);
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
    throw new AppError("Failed to send verification email", 500);
  }

  const { password: _password, ...safeUser } = userCreated.toObject();

  return successResponse(
    res,
    201,
    "Verification email sent to your email. Please check and verify your account.",
    { user: safeUser },
  );
});

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  if (user.isGoogleUser) {
    throw new AppError(
      "هذا الحساب مسجّل بواسطة Google. من فضلك سجّل الدخول باستخدام Google.",
      400,
    );
  }

  if (!user.isEmailVerified) {
    const existingVerification = await Verification.findOne({
      userId: user._id,
    });

    if (existingVerification && existingVerification.expiresAt > new Date()) {
      throw new AppError(
        "Email not verified. Please check your email for the verification link.",
        400,
      );
    }

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
      throw new AppError("Failed to send verification email", 500);
    }

    return successResponse(
      res,
      201,
      "Verification email sent to your email. Please check and verify your account.",
    );
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const { accessToken, refreshToken } = await issueAuthTokens(user);
  setAuthCookies(res, accessToken, refreshToken);

  user.lastLogin = new Date();
  await user.save();

  const { password: _password, ...safeUser } = user.toObject();

  return successResponse(res, 200, "Login successful", {
    user: safeUser,
    accessToken,
    refreshToken,
  });
});

const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  let payload: JwtPayload & { userId?: string; purpose?: string };
  try {
    payload = jwt.verify(token, config.JWT.SECRET) as JwtPayload & {
      userId?: string;
      purpose?: string;
    };
  } catch {
    throw new AppError("Unauthorized", 401);
  }

  const { userId, purpose } = payload;
  if (purpose !== "email-verification" || !userId) {
    throw new AppError("Unauthorized", 401);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  if (user.isEmailVerified) {
    throw new AppError("Email already verified", 400);
  }

  const verification = await Verification.findOne({
    userId,
    token,
  });

  if (!verification) {
    throw new AppError("Unauthorized", 401);
  }

  const isExpired = verification.expiresAt.getTime() < Date.now();
  if (isExpired) {
    throw new AppError("Token expired", 401);
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

  const { password: _password, ...safeUser } = user.toObject();

  return successResponse(res, 200, "Email verified successfully", {
    user: safeUser,
  });
});

const resetPasswordRequest = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.isEmailVerified) {
    throw new AppError("Please verify your email first", 400);
  }

  const existingVerification = await Verification.findOne({
    userId: user.id,
  });

  if (existingVerification && existingVerification.expiresAt > new Date()) {
    throw new AppError("Reset password request already sent", 400);
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
    throw new AppError("Failed to send reset password email", 500);
  }

  return successResponse(res, 200, "Reset password email sent");
});

const verifyResetPasswordTokenAndResetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { token, newPassword, confirmPassword } = req.body;

    let payload: JwtPayload & { userId?: string; purpose?: string };
    try {
      payload = jwt.verify(token, config.JWT.SECRET) as JwtPayload & {
        userId?: string;
        purpose?: string;
      };
    } catch {
      throw new AppError("Unauthorized", 401);
    }

    const { userId, purpose } = payload;

    if (purpose !== "reset-password" || !userId) {
      throw new AppError("Unauthorized", 401);
    }

    const verification = await Verification.findOne({
      userId,
      token,
    });

    if (!verification) {
      throw new AppError("Unauthorized", 401);
    }

    const isTokenExpired = verification.expiresAt < new Date();

    if (isTokenExpired) {
      throw new AppError("Token expired", 401);
    }

    const user = await User.findById(userId);

    if (!user) {
      throw new AppError("Unauthorized", 401);
    }

    if (newPassword !== confirmPassword) {
      throw new AppError("Passwords do not match", 400);
    }

    user.password = newPassword;
    await user.save();

    await Verification.findByIdAndDelete(verification.id);

    return successResponse(res, 200, "Password reset successfully");
  },
);

const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken =
    req.body.refreshToken ||
    req.cookies?.refreshToken ||
    req.headers.authorization?.split(" ")[1];

  if (!refreshToken) {
    throw new AppError("Refresh token is required", 401);
  }

  let payload: JwtPayload & { userId?: string; purpose?: string };
  try {
    payload = jwt.verify(
      refreshToken,
      config.JWT.REFRESH_SECRET,
    ) as JwtPayload & { userId?: string; purpose?: string };
  } catch {
    throw new AppError("Invalid refresh token", 401);
  }

  if (payload.purpose !== "refresh" || !payload.userId) {
    throw new AppError("Invalid refresh token", 401);
  }

  const storedToken = await Verification.findOne({
    userId: payload.userId,
    token: refreshToken,
    purpose: "refresh-token",
  });

  if (!storedToken || storedToken.expiresAt.getTime() < Date.now()) {
    throw new AppError("Refresh token expired or revoked", 401);
  }

  const user = await User.findById(payload.userId);
  if (!user) {
    throw new AppError("User not found", 401);
  }

  const tokens = await issueAuthTokens(user);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

  return successResponse(res, 200, "Token refreshed successfully", {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
});

export {
  registerUser,
  loginUser,
  verifyEmail,
  resetPasswordRequest,
  verifyResetPasswordTokenAndResetPassword,
  refreshAccessToken,
};
