import rateLimit from "express-rate-limit";
import { AppError } from "../utils/AppError.js";

function handler(): never {
  throw AppError.rateLimited();
}

/** General API traffic. */
export const apiRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/** AI/media generation is expensive — much stricter. */
export const generationRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/** Auth endpoints — resist credential stuffing / brute force. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});
