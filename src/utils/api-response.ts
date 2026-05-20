import { Response } from "express";

export interface ApiSuccessBody<T = unknown> {
  success: true;
  message: string;
  metadata: Record<string, unknown>;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  error: {
    statusCode: number;
    details: unknown;
  };
}

export function successResponse<T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T = {} as T,
  metadata: Record<string, unknown> = {},
): Response<ApiSuccessBody<T>> {
  return res.status(statusCode).json({
    success: true,
    message,
    metadata,
    data,
  });
}

export function errorResponse(
  res: Response,
  statusCode: number,
  message: string,
  details: unknown = null,
): Response<ApiErrorBody> {
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      statusCode,
      details,
    },
  });
}
