import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function createOriginGuard(allowedOrigin: string) {
  return function originGuard(req: Request, _res: Response, next: NextFunction): void {
    const origin = req.get("origin");
    if (!SAFE_METHODS.has(req.method) && origin && origin !== allowedOrigin) {
      next(new HttpError(403, "Origin not allowed"));
      return;
    }
    next();
  };
}
