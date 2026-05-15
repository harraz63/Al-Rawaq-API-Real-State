import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { config } from "../config/app-config";

export const generateJWTToken = (
  userId: string,
  purpose: string,
  role?: string,
) => {
  const secret: Secret = config.JWT.SECRET as string;
  const payload: Record<string, string> = { userId, purpose };
  if (role) payload.role = role;

  return jwt.sign(payload, secret, {
    expiresIn: "1h",
  } as SignOptions);
};

export const generateAccessToken = (userId: string, role: string) => {
  const secret: Secret = config.JWT.SECRET as string;

  return jwt.sign({ userId, role, purpose: "login" }, secret, {
    expiresIn: config.JWT.EXPIRES_IN,
  } as SignOptions);
};

export const generateRefreshToken = (userId: string) => {
  const secret: Secret = config.JWT.REFRESH_SECRET as string;

  return jwt.sign({ userId, purpose: "refresh" }, secret, {
    expiresIn: config.JWT.REFRESH_EXPIRES_IN,
  } as SignOptions);
};
