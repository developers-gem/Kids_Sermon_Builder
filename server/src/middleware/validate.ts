import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

type Location = "body" | "query" | "params";

/**
 * Validates req[location] against the given Zod schema and replaces it with
 * the parsed (and defaulted/coerced) value. Throws ZodError on failure,
 * which errorHandler turns into a 422 VALIDATION_ERROR response.
 */
export function validate(schema: ZodTypeAny, location: Location = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[location]);
    (req as unknown as Record<Location, unknown>)[location] = parsed;
    next();
  };
}
