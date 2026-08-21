import { Router } from "express";
import { audioController } from "../controllers/audioController.js";
import { validate } from "../middleware/validate.js";
import { generationRateLimiter } from "../middleware/rateLimit.js";
import { GenerateAudioInput } from "@ksb/validation";

/**
 * mergeParams: true is required here — this router is mounted at
 * "/api/lessons/:lessonId/audio" in app.ts, and without mergeParams the
 * parent route's :lessonId param would not be visible on req.params inside
 * this router at all (a real bug the previous version of this file had).
 */
export const audioRouter = Router({ mergeParams: true });

audioRouter.post(
  "/:moduleId/generate",
  generationRateLimiter,
  validate(GenerateAudioInput),
  audioController.generate,
);
audioRouter.get("/", audioController.list);
