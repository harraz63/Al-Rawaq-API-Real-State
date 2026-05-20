import { Request, Response } from "express";
import { errorResponse } from "../utils/api-response";

export const notFoundHandler = (req: Request, res: Response): void => {
  errorResponse(
    res,
    404,
    `Route not found: ${req.method} ${req.originalUrl}`,
    null,
  );
};
