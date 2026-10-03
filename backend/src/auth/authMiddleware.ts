import { NextFunction, Request, Response } from "express";
import { AuthService } from "./authService";
import { UserAccount, UserRole } from "./authTypes";
import { HttpError } from "../utils/httpError";

const RATE_WINDOW_MS = 15 * 60_000;
const MAX_AUTH_REQUESTS_PER_WINDOW = 20;

export function createAuthRequestLimiter() {
  const buckets = new Map<string, { count: number; resetsAt: number }>();
  return function authRequestLimiter(req: Request, _res: Response, next: NextFunction): void {
    const now = Date.now();
    const key = req.ip ?? "unknown";
    if (buckets.size > 5000) {
      for (const [ip, bucket] of buckets) {
        if (bucket.resetsAt <= now) buckets.delete(ip);
      }
    }
    const current = buckets.get(key);
    if (!current || current.resetsAt <= now) {
      buckets.set(key, { count: 1, resetsAt: now + RATE_WINDOW_MS });
      next();
      return;
    }
    current.count += 1;
    if (current.count > MAX_AUTH_REQUESTS_PER_WINDOW) {
      next(new HttpError(429, "Too many authentication requests"));
      return;
    }
    next();
  };
}

declare global {
  namespace Express {
    interface Request {
      authUser?: UserAccount;
      authSessionToken?: string;
      authSessionExpiresAt?: Date;
    }
  }
}

export function createRequireAuth(auth: AuthService) {
  return async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const token = readCookie(req.headers.cookie, "evp_session");
      const session = await auth.authenticate(token);
      if (!session) throw new HttpError(401, "Authentication required");
      if (session.user.role === "patient" && !session.user.masterId) {
        throw new HttpError(403, "Patient account is not linked to a patient record");
      }
      req.authUser = session.user;
      req.authSessionToken = session.tokenHash;
      req.authSessionExpiresAt = session.expiresAt;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireRoles(...roles: UserRole[]) {
  return function authorizeRole(req: Request, _res: Response, next: NextFunction): void {
    if (!req.authUser) {
      next(new HttpError(401, "Authentication required"));
      return;
    }
    if (!roles.includes(req.authUser.role)) {
      next(new HttpError(403, "Insufficient permissions"));
      return;
    }
    next();
  };
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}
