import type { Request, Response } from "express";
import { getOrCreateNarration, listNarrationForLesson } from "../services/audioService.js";
import { AppError } from "../utils/AppError.js";
import { ok } from "../utils/respond.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { GenerateAudioInput } from "@ksb/validation";
import type { NarrationStyleId } from "@ksb/types";

export const audioController = {
  /**
   * POST /api/lessons/:lessonId/audio/:moduleId/generate (Prompt 06/12).
   * Returns a cached clip's URL if one already exists for this exact
   * (lesson, module, text, voice, style) combination; otherwise generates,
   * caches, and returns the new one. Either way the response is JSON with a
   * URL, not a streamed audio body — the client fetches the audio file
   * directly from that URL (served by express.static under /media).
   */
  generate: asyncHandler(async (req: Request, res: Response) => {
    const { lessonId, moduleId } = req.params as { lessonId: string; moduleId: string };
    if (!lessonId || !moduleId) {
      throw AppError.validation("Missing lesson or module id.");
    }
    const { text, voice, style } = req.body as GenerateAudioInput;

    const result = await getOrCreateNarration({
      lessonId,
      moduleId,
      text,
      voice,
      style: style as NarrationStyleId,
    });

    ok(res, result, result.cached ? "Using cached narration" : "Narration generated");
  }),

  /** GET /api/lessons/:lessonId/audio — every cached clip for a lesson, for the "play whole lesson" playlist. */
  list: asyncHandler(async (req: Request, res: Response) => {
    const { lessonId } = req.params as { lessonId: string };
    const assets = await listNarrationForLesson(lessonId);
    ok(res, { assets });
  }),
};
