import type { Request, Response } from "express";
import { lessonService } from "../services/lessonService.js";
import { created } from "../utils/respond.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { GenerateLessonInput } from "@ksb/validation";

export const aiController = {
  generateLesson: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as GenerateLessonInput;
    const ownerId = req.user?.sub ?? null;
    const lesson = await lessonService.createFromAi(ownerId, body);
    created(res, { lesson }, "Lesson generated");
  }),
};
