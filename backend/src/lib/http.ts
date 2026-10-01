import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z, ZodTypeAny } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export const notFound = (what: string) => new HttpError(404, "NOT_FOUND", `${what} not found`);
export const badRequest = (code: string, message?: string) => new HttpError(400, code, message);

/** Wraps an async handler so rejected promises reach the error middleware. */
export function handler(fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res)
      .then((body) => {
        if (!res.headersSent && body !== undefined) res.json(body);
      })
      .catch(next);
  };
}

/** Parses a request part with a zod schema, turning failures into a 400. */
export function parse<S extends ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new HttpError(400, "VALIDATION_ERROR", `${first.path.join(".") || "request"}: ${first.message}`);
  }
  return result.data;
}
