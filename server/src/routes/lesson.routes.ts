import { Router } from "express";
import { lessonController } from "../controllers/lessonController.js";
import { validate } from "../middleware/validate.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { generationRateLimiter } from "../middleware/rateLimit.js";
import {
  CreateLessonFromStoryInput,
  UpdateLessonModulesInput,
  ReorderModulesInput,
  UpdateLessonContentInput,
  SaveVersionInput,
  RegenerateModuleInput,
  GenerateColoringPageInput,
} from "@ksb/validation";

export const lessonRouter = Router();

// Guests can build+preview a lesson from a story without an account.
lessonRouter.post("/", optionalAuth, validate(CreateLessonFromStoryInput), lessonController.createFromStory);

// Everything below requires an account (saving/listing "my lessons").
lessonRouter.get("/", requireAuth, lessonController.list);
lessonRouter.get("/:id", optionalAuth, lessonController.getById);
lessonRouter.get("/:id/pdf", optionalAuth, lessonController.downloadPdf);
lessonRouter.get("/:id/coloring-page/pdf", optionalAuth, lessonController.downloadColoringPagePdf);
lessonRouter.put(
  "/:id/modules",
  optionalAuth,
  validate(UpdateLessonModulesInput),
  lessonController.updateModules,
);
lessonRouter.post(
  "/:id/modules/reorder",
  optionalAuth,
  validate(ReorderModulesInput),
  lessonController.reorderModules,
);
lessonRouter.put(
  "/:id",
  requireAuth,
  validate(UpdateLessonContentInput),
  lessonController.updateContent,
);
lessonRouter.post("/:id/duplicate", requireAuth, lessonController.duplicate);
lessonRouter.post("/:id/share", requireAuth, lessonController.createShare);
lessonRouter.delete("/:id/share", requireAuth, lessonController.revokeShare);
lessonRouter.post(
  "/:id/versions",
  requireAuth,
  validate(SaveVersionInput),
  lessonController.saveVersion,
);
lessonRouter.get("/:id/versions", requireAuth, lessonController.listVersions);
lessonRouter.post("/:id/versions/:versionId/restore", requireAuth, lessonController.restoreVersion);
lessonRouter.post(
  "/:id/modules/:moduleId/regenerate",
  requireAuth,
  generationRateLimiter,
  validate(RegenerateModuleInput),
  lessonController.regenerateModule,
);
lessonRouter.post(
  "/:id/coloring-page/generate",
  requireAuth,
  generationRateLimiter,
  validate(GenerateColoringPageInput),
  lessonController.generateColoringPage,
);
lessonRouter.post(
  "/:id/coloring-page/regenerate",
  requireAuth,
  generationRateLimiter,
  validate(GenerateColoringPageInput),
  lessonController.generateColoringPage,
);
lessonRouter.post("/:id/favorite", requireAuth, lessonController.favorite);
lessonRouter.delete("/:id/favorite", requireAuth, lessonController.unfavorite);
lessonRouter.post("/:id/archive", requireAuth, lessonController.archive);
lessonRouter.delete("/:id/archive", requireAuth, lessonController.unarchive);
lessonRouter.delete("/:id", requireAuth, lessonController.remove);
