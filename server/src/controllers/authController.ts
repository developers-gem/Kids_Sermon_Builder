import type { Request, Response } from "express";
import { randomBytes, createHash } from "node:crypto";
import { User } from "../models/User.js";
import { hashPassword, verifyPassword, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/auth.js";
import { AppError } from "../utils/AppError.js";
import { ok, created } from "../utils/respond.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isProd, env } from "../config/env.js";
import { sendPasswordResetEmail } from "../integrations/email/index.js";
import type { ForgotPasswordInput, ResetPasswordInput } from "@ksb/validation";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie("ksb_refresh_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function publicUser(user: { _id: unknown; name: string; email: string; role: string }) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body as { name: string; email: string; password: string };
    const existing = await User.findOne({ email });
    if (existing) throw AppError.validation("An account with this email already exists.");

    const passwordHash = await hashPassword(password);
    const user = await User.create({ name, email, passwordHash });

    const accessToken = signAccessToken({ sub: String(user._id), role: user.role as "user" | "admin" });
    const refreshToken = signRefreshToken({ sub: String(user._id), ver: user.refreshTokenVersion });
    setRefreshCookie(res, refreshToken);

    created(res, { user: publicUser(user), accessToken }, "Account created");
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) throw AppError.validation("Invalid email or password.");

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw AppError.validation("Invalid email or password.");

    const accessToken = signAccessToken({ sub: String(user._id), role: user.role as "user" | "admin" });
    const refreshToken = signRefreshToken({ sub: String(user._id), ver: user.refreshTokenVersion });
    setRefreshCookie(res, refreshToken);

    ok(res, { user: publicUser(user), accessToken }, "Logged in");
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const token = (req as unknown as { cookies?: Record<string, string> }).cookies?.["ksb_refresh_token"];
    if (!token) throw AppError.authRequired("No refresh token provided.");

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw AppError.authRequired("Your session has expired. Please log in again.");
    }

    const user = await User.findById(payload.sub);
    if (!user || user.refreshTokenVersion !== payload.ver) {
      throw AppError.authRequired("Your session has expired. Please log in again.");
    }

    const accessToken = signAccessToken({ sub: String(user._id), role: user.role as "user" | "admin" });
    ok(res, { accessToken });
  }),

  logout: asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie("ksb_refresh_token", { path: "/api/auth" });
    ok(res, {}, "Logged out");
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findById(req.user!.sub);
    if (!user) throw AppError.authRequired();
    ok(res, { user: publicUser(user) });
  }),

  /**
   * Always responds with the same generic success message whether or not
   * the email is registered — a different response for "unknown email"
   * vs "reset link sent" lets an attacker enumerate which emails have
   * accounts, which this deliberately avoids.
   */
  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as ForgotPasswordInput;
    const user = await User.findOne({ email });

    if (user) {
      const rawToken = randomBytes(32).toString("base64url");
      user.resetPasswordTokenHash = hashToken(rawToken);
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      const resetLink = `${env.WEB_ORIGIN}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(user.email, resetLink);
    }

    ok(res, {}, "If that email has an account, a reset link has been sent.");
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body as ResetPasswordInput;
    const tokenHash = hashToken(token);

    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordTokenHash +resetPasswordExpires");

    if (!user) {
      throw AppError.validation("This reset link is invalid or has expired. Please request a new one.");
    }

    user.passwordHash = await hashPassword(password);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    // Password reset is a strong signal to end every existing session —
    // including on a device an attacker may have been using — not just
    // the one making this request.
    user.refreshTokenVersion += 1;
    await user.save();

    res.clearCookie("ksb_refresh_token", { path: "/api/auth" });
    ok(res, {}, "Your password has been reset. Please log in again.");
  }),
};
