import { Router } from "express";
import { aiController } from "../controllers/aiController.js";
import { validate } from "../middleware/validate.js";
import { optionalAuth } from "../middleware/auth.js";
import { generationRateLimiter } from "../middleware/rateLimit.js";
import { GenerateLessonInput } from "@ksb/validation";

export const aiRouter = Router();

aiRouter.post(
  "/generate-lesson",
  optionalAuth,
  generationRateLimiter,
  validate(GenerateLessonInput),
  aiController.generateLesson,
);
