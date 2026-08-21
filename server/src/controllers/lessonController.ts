import type { Request, Response } from "express";
import { lessonService } from "../services/lessonService.js";
import { sharingService } from "../services/sharingService.js";
import { AppError } from "../utils/AppError.js";
import { ok, created } from "../utils/respond.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toPublicLessonView } from "../utils/lessonView.js";
import { LESSON_MODULE_IDS } from "@ksb/types";
import { renderLessonPdf, renderColoringPagePdf, type PdfPageSize } from "../integrations/pdf/lessonPdf.js";
import type {
  CreateLessonFromStoryInput,
  UpdateLessonModulesInput,
  ReorderModulesInput,
  UpdateLessonContentInput,
  SaveVersionInput,
  RegenerateModuleInput,
  GenerateColoringPageInput,
} from "@ksb/validation";
import type { RegeneratableModule } from "../services/aiService.js";

function ownerId(req: Request): string | null {
  return req.user?.sub ?? null;
}

function requireOwnerId(req: Request): string {
  if (!req.user) throw AppError.authRequired("Sign in to save lessons to your account.");
  return req.user.sub;
}

export const lessonController = {
  createFromStory: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as CreateLessonFromStoryInput;
    const lesson = await lessonService.createFromStory(ownerId(req), body);
    created(res, { lesson }, "Lesson created from story");
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const owner = requireOwnerId(req);
    const { status, favorite, archived, page = "1", limit = "20" } = req.query as Record<string, string>;
    const { items, total } = await lessonService.listForOwner(owner, {
      status,
      favorite: favorite === "true" ? true : undefined,
      archived: archived === "true" ? true : undefined,
      page: Number(page),
      limit: Number(limit),
    });
    ok(res, { lessons: items, pagination: { page: Number(page), limit: Number(limit), total } });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const requester = ownerId(req);
    const lesson = await lessonService.getById(req.params.id as string, requester);
    const isOwner = requester !== null && String(lesson.ownerId) === requester;
    ok(res, { lesson: isOwner ? lesson : toPublicLessonView(lesson) });
  }),

  downloadPdf: asyncHandler(async (req: Request, res: Response) => {
    const lesson = await lessonService.getById(req.params.id as string, ownerId(req));
    const size = req.query.size === "a4" ? "a4" : ("letter" as PdfPageSize);
    const buffer = await renderLessonPdf(lesson, size);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${lesson._id}.pdf"`);
    res.send(buffer);
  }),

  downloadColoringPagePdf: asyncHandler(async (req: Request, res: Response) => {
    const lesson = await lessonService.getById(req.params.id as string, ownerId(req));
    if (!lesson.coloringPage) {
      throw AppError.notFound("This lesson has no coloring page.");
    }
    const size = req.query.size === "a4" ? "a4" : ("letter" as PdfPageSize);
    const buffer = await renderColoringPagePdf(lesson, size);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${lesson._id}-coloring-page.pdf"`,
    );
    res.send(buffer);
  }),

  updateModules: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as UpdateLessonModulesInput;
    const lesson = await lessonService.updateModules(req.params.id as string, ownerId(req), body.activeModules);
    ok(res, { lesson });
  }),

  reorderModules: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as ReorderModulesInput;
    const lesson = await lessonService.reorderModules(req.params.id as string, ownerId(req), body.order);
    ok(res, { lesson });
  }),

  updateContent: asyncHandler(async (req: Request, res: Response) => {
    const owner = requireOwnerId(req);
    const body = req.body as UpdateLessonContentInput;
    const lesson = await lessonService.updateContent(req.params.id as string, owner, body);
    ok(res, { lesson }, "Lesson updated");
  }),

  duplicate: asyncHandler(async (req: Request, res: Response) => {
    const owner = requireOwnerId(req);
    const lesson = await lessonService.duplicate(req.params.id as string, owner);
    created(res, { lesson }, "Lesson duplicated");
  }),

  createShare: asyncHandler(async (req: Request, res: Response) => {
    const owner = requireOwnerId(req);
    const link = await sharingService.createShareLink(req.params.id as string, owner);
    created(res, { token: link.token }, "Share link created");
  }),

  revokeShare: asyncHandler(async (req: Request, res: Response) => {
    const owner = requireOwnerId(req);
    await sharingService.revokeShareLink(req.params.id as string, owner);
    ok(res, {}, "Share link revoked");
  }),

  saveVersion: asyncHandler(async (req: Request, res: Response) => {
    const owner = requireOwnerId(req);
    const { label } = req.body as SaveVersionInput;
    const version = await lessonService.saveVersion(req.params.id as string, owner, label);
    created(res, { version }, "Version saved");
  }),

  listVersions: asyncHandler(async (req: Request, res: Response) => {
    const owner = requireOwnerId(req);
    const versions = await lessonService.listVersions(req.params.id as string, owner);
    ok(res, { versions });
  }),

  restoreVersion: asyncHandler(async (req: Request, res: Response) => {
    const owner = requireOwnerId(req);
    const lesson = await lessonService.restoreVersion(
      req.params.id as string,
      owner,
      req.params.versionId as string,
    );
    ok(res, { lesson }, "Version restored");
  }),

  regenerateModule: asyncHandler(async (req: Request, res: Response) => {
    const owner = requireOwnerId(req);
    const moduleId = req.params.moduleId as string;
    if (!LESSON_MODULE_IDS.includes(moduleId as (typeof LESSON_MODULE_IDS)[number])) {
      throw AppError.validation(`Unknown module id: ${moduleId}`);
    }
    const { instruction } = req.body as RegenerateModuleInput;
    const lesson = await lessonService.regenerateModule(
      req.params.id as string,
      owner,
      moduleId as RegeneratableModule,
      instruction,
    );
    ok(res, { lesson }, "Module regenerated");
  }),

  generateColoringPage: asyncHandler(async (req: Request, res: Response) => {
    const owner = requireOwnerId(req);
    const { instruction } = req.body as GenerateColoringPageInput;
    const lesson = await lessonService.generateColoringPage(req.params.id as string, owner, instruction);
    ok(res, { lesson }, "Coloring page generated");
  }),

  favorite: asyncHandler(async (req: Request, res: Response) => {
    const owner = requireOwnerId(req);
    const lesson = await lessonService.setFavorite(req.params.id as string, owner, true);
    ok(res, { lesson });
  }),

  unfavorite: asyncHandler(async (req: Request, res: Response) => {
    const owner = requireOwnerId(req);
    const lesson = await lessonService.setFavorite(req.params.id as string, owner, false);
    ok(res, { lesson });
  }),

  archive: asyncHandler(async (req: Request, res: Response) => {
    const owner = requireOwnerId(req);
    const lesson = await lessonService.setArchived(req.params.id as string, owner, true);
    ok(res, { lesson });
  }),

  unarchive: asyncHandler(async (req: Request, res: Response) => {
    const owner = requireOwnerId(req);
    const lesson = await lessonService.setArchived(req.params.id as string, owner, false);
    ok(res, { lesson });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const owner = requireOwnerId(req);
    await lessonService.remove(req.params.id as string, owner);
    ok(res, {}, "Lesson deleted");
  }),
};
