import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { verifyAccessToken, type AccessTokenPayload } from "../utils/auth.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: AccessTokenPayload;
  }
}

function extractToken(req: Request): string | null {
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  // Fallback to httpOnly cookie for browser clients.
  const cookieToken = (req as unknown as { cookies?: Record<string, string> }).cookies?.[
    "ksb_access_token"
  ];
  return cookieToken ?? null;
}

/** Attaches req.user if a valid token is present; never rejects. Use for guest-allowed routes. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) return next();
  try {
    req.user = verifyAccessToken(token);
  } catch {
    // Invalid/expired token on an optional route: proceed as guest.
  }
  next();
}

/** Rejects with 401 AUTH_REQUIRED unless a valid access token is present. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) return next(AppError.authRequired());
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(AppError.authRequired("Your session has expired. Please log in again."));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(AppError.authRequired());
  if (req.user.role !== "admin") return next(AppError.forbidden("Admin access required"));
  next();
}
