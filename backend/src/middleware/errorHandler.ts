import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json(
      err.details === undefined ? { error: err.message } : { error: err.message, details: err.details },
    );
    return;
  }
  if ((err as { type?: string } | null)?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Malformed JSON body" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
