import type { Request, Response } from "express";
import { sharingService } from "../services/sharingService.js";
import { AppError } from "../utils/AppError.js";
import { toPublicLessonView } from "../utils/lessonView.js";
import { ok, created } from "../utils/respond.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const sharedController = {
  getByToken: asyncHandler(async (req: Request, res: Response) => {
    const lesson = await sharingService.getByToken(req.params.token as string);
    ok(res, { lesson: toPublicLessonView(lesson) });
  }),

  duplicate: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.authRequired("Log in to save a copy of this lesson.");
    const lesson = await sharingService.duplicateFromToken(req.params.token as string, req.user.sub);
    created(res, { lesson }, "Lesson duplicated to My Lessons");
  }),
};
