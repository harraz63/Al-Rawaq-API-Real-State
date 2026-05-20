import { ZodError } from "zod";

export interface ZodFieldError {
  field: string;
  message: string;
}

export function formatZodErrors(error: ZodError): ZodFieldError[] {
  return error.errors.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "root",
    message: issue.message,
  }));
}
