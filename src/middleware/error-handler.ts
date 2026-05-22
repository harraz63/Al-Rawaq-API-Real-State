import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import multer from "multer";
import { AppError } from "../errors/app-error";
import { errorResponse } from "../utils/api-response";
import { formatZodErrors } from "../utils/format-zod-errors";

const isDuplicateKeyError = (
  err: unknown,
): err is { code: number; keyValue: Record<string , unknown> } => {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: number }).code === 11000
  );
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  if (err instanceof AppError) {
    errorResponse(res, err.statusCode, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    errorResponse(res, 400, "Validation failed", formatZodErrors(err));
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    errorResponse(res, 400, "Database validation failed", details);
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    errorResponse(res, 400, `Invalid ${err.path}`, null);
    return;
  }

  if (isDuplicateKeyError(err)) {
    errorResponse(res, 409, "Duplicate field value", err.keyValue);
    return;
  }

  if (err instanceof jwt.JsonWebTokenError) {
    errorResponse(res, 401, "Invalid or expired token", null);
    return;
  }

  if (err instanceof jwt.TokenExpiredError) {
    errorResponse(res, 401, "Token expired", null);
    return;
  }

  if (err instanceof multer.MulterError) {
    const statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    errorResponse(res, statusCode, err.message, { code: err.code, field: err.field });
    return;
  }

  const message =
    err instanceof Error ? err.message : "Internal server error";

  errorResponse(res, 500, message, null);
};
