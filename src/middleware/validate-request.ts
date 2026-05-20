import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodSchema } from "zod";
import { errorResponse } from "../utils/api-response";
import { formatZodErrors } from "../utils/format-zod-errors";

interface ValidateSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

export const validateRequest = (schemas: ValidateSchemas): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationErrors: Array<{
      location: "body" | "params" | "query";
      fields: ReturnType<typeof formatZodErrors>;
    }> = [];

    if (schemas.params) {
      const parsed = schemas.params.safeParse(req.params);
      if (!parsed.success) {
        validationErrors.push({
          location: "params",
          fields: formatZodErrors(parsed.error),
        });
      } else {
        req.params = parsed.data as typeof req.params;
      }
    }

    if (schemas.query) {
      const parsed = schemas.query.safeParse(req.query);
      if (!parsed.success) {
        validationErrors.push({
          location: "query",
          fields: formatZodErrors(parsed.error),
        });
      } else {
        req.query = parsed.data as typeof req.query;
      }
    }

    if (schemas.body) {
      const parsed = schemas.body.safeParse(req.body);
      if (!parsed.success) {
        validationErrors.push({
          location: "body",
          fields: formatZodErrors(parsed.error),
        });
      } else {
        req.body = parsed.data;
      }
    }

    if (validationErrors.length > 0) {
      return errorResponse(res, 400, "Validation failed", validationErrors);
    }

    return next();
  };
};
