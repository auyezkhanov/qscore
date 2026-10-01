import type { ErrorRequestHandler, RequestHandler } from "express";
import { HttpError } from "../lib/http";
import { createLogger } from "../lib/logger";

const log = createLogger("http");

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, "NOT_FOUND", `Route not found: ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Never let a shared cache keep an error response.
  res.setHeader("Cache-Control", "no-store");
  if (err instanceof HttpError) {
    if (err.status >= 500) log.warn(`${req.method} ${req.originalUrl} -> ${err.status} ${err.message}`);
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // Malformed JSON body from express.json().
  if ((err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "INVALID_JSON", message: "Malformed JSON body" } });
    return;
  }
  // The logger prints the stack trace for Error instances.
  log.error(`${req.method} ${req.originalUrl} failed`, err);
  res.status(500).json({ error: { code: "INTERNAL", message: "Internal server error" } });
};
