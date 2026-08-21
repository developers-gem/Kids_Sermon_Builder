import type { Request, Response } from "express";
import { storyService } from "../services/storyService.js";
import { ok } from "../utils/respond.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { StoryQueryInput } from "@ksb/validation";

export const storyController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as StoryQueryInput;
    const { items, pagination } = await storyService.list(query);
    ok(res, { stories: items, pagination });
  }),

  featured: asyncHandler(async (_req: Request, res: Response) => {
    const stories = await storyService.featured();
    ok(res, { stories });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const story = await storyService.getById(req.params.id as string);
    ok(res, { story });
  }),
};
