import type { Response } from "express";

/** Sends the standard { success: true, data, message? } envelope. */
export function ok<T>(res: Response, data: T, message?: string, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data, ...(message ? { message } : {}) });
}

export function created<T>(res: Response, data: T, message?: string): void {
  ok(res, data, message, 201);
}
