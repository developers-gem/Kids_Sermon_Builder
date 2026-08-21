import type { Request, Response } from "express";
import { adminStoryService } from "../services/adminStoryService.js";
import { ok, created } from "../utils/respond.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type {
  CreateStoryInput,
  UpdateStoryInput,
  SetStoryStatusInput,
  AdminStoryQueryInput,
} from "@ksb/validation";

export const adminStoryController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as AdminStoryQueryInput;
    const { items, pagination } = await adminStoryService.list(query);
    ok(res, { stories: items, pagination });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const story = await adminStoryService.getById(req.params.id as string);
    ok(res, { story });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as CreateStoryInput;
    const story = await adminStoryService.create(body);
    created(res, { story }, "Story created");
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as UpdateStoryInput;
    const story = await adminStoryService.update(req.params.id as string, body);
    ok(res, { story }, "Story updated");
  }),

  setStatus: asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body as SetStoryStatusInput;
    const story = await adminStoryService.setStatus(req.params.id as string, status);
    ok(res, { story }, `Story ${status}`);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await adminStoryService.remove(req.params.id as string);
    ok(res, {}, "Story deleted");
  }),
};
