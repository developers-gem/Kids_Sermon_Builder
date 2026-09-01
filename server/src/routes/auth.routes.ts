import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/rateLimit.js";
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from "@ksb/validation";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, validate(RegisterInput), authController.register);
authRouter.post("/login", authRateLimiter, validate(LoginInput), authController.login);
authRouter.post("/refresh", authRateLimiter, authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", requireAuth, authController.me);
//user delete route
authRouter.post("/delete-user", authController.deleteUser);


authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validate(ForgotPasswordInput),
  authController.forgotPassword,
);
authRouter.post(
  "/reset-password",
  authRateLimiter,
  validate(ResetPasswordInput),
  authController.resetPassword,
);

