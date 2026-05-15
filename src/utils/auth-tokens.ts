import { IUser } from "../models/User";
import Verification from "../models/verification";
import { config } from "../config/app-config";
import { generateAccessToken, generateRefreshToken } from "./generateToken";

function parseDurationToMs(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/i);
  if (!match) return 30 * 24 * 60 * 60 * 1000;

  const value = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[unit] ?? multipliers.d);
}

function getRefreshTokenExpiry(): Date {
  return new Date(
    Date.now() + parseDurationToMs(config.JWT.REFRESH_EXPIRES_IN),
  );
}

export async function issueAuthTokens(user: IUser) {
  const userId = String(user.id);
  const accessToken = generateAccessToken(userId, user.role);
  const refreshToken = generateRefreshToken(userId);

  await Verification.deleteMany({ userId: user._id, purpose: "refresh-token" });
  await Verification.create({
    userId: user._id,
    token: refreshToken,
    purpose: "refresh-token",
    expiresAt: getRefreshTokenExpiry(),
  });

  return { accessToken, refreshToken };
}

export function setAuthCookies(
  res: { cookie: (name: string, value: string, options: object) => void },
  accessToken: string,
  refreshToken: string,
) {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  res.cookie("token", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}
