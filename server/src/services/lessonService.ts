import { LESSON_MODULES } from "@ksb/constants";
import type { LessonModuleId } from "@ksb/types";
import { lessonRepository } from "../repositories/lessonRepository.js";
import { lessonVersionRepository } from "../repositories/lessonVersionRepository.js";
import { generationJobRepository } from "../repositories/generationJobRepository.js";
import { storyService } from "./storyService.js";
import {
  generateLessonPlan,
  generateLessonIllustration,
  generateColoringPage,
  regenerateModule as regenerateModuleContent,
  type RegeneratableModule,
} from "./aiService.js";
import { AppError } from "../utils/AppError.js";
import type {
  GenerateLessonInput,
  CreateLessonFromStoryInput,
  UpdateLessonContentInput,
  RegenerateStoryOutput,
  RegenerateVerseOutput,
  RegenerateGamesOutput,
  RegenerateObjectLessonOutput,
  RegenerateColoringOutput,
  RegeneratePrayerOutput,
} from "@ksb/validation";

function computeDuration(activeModules: LessonModuleId[]): number {
  return LESSON_MODULES.filter((m) => activeModules.includes(m.id)).reduce(
    (sum, m) => sum + m.minutes,
    0,
  );
}

/** Maps a regenerated module's validated AI output onto the Lesson fields it owns. */
function moduleContentToPatch(
  moduleId: RegeneratableModule,
  output: unknown,
  existingColoringPage: { image?: string | null; alt?: string | null; caption?: string | null } | null | undefined,
): Record<string, unknown> {
  switch (moduleId) {
    case "story": {
      const { story, askThem } = output as RegenerateStoryOutput;
      return { story, askThem };
    }
    case "verse": {
      const { memoryVerse } = output as RegenerateVerseOutput;
      return { memoryVerse };
    }
    case "games": {
      const { games } = output as RegenerateGamesOutput;
      return { games };
    }
    case "object": {
      const { objectLesson } = output as RegenerateObjectLessonOutput;
      return { objectLesson };
    }
    case "coloring": {
      const { caption } = output as RegenerateColoringOutput;
      return {
        coloringPage: {
          image: existingColoringPage?.image ?? "",
          alt: existingColoringPage?.alt ?? "",
          caption,
        },
      };
    }
    case "prayer": {
      const { prayer } = output as RegeneratePrayerOutput;
      return { prayer };
    }
  }
}

export const lessonService = {
  /** Workflow A: build a lesson from one of the built-in Bible stories. */
  async createFromStory(ownerId: string | null, input: CreateLessonFromStoryInput) {
    const story = await storyService.getById(input.storyId);

    return lessonRepository.create({
      ownerId,
      source: "story",
      storyId: String(story._id),
      title: story.title,
      bibleReference: story.reference,
      ageGroup: story.ageRange,
      theme: story.theme,
      bigIdea: story.bigIdea,
      story: story.tellIt,
      askThem: story.askThem,
      memoryVerse: story.memoryVerse,
      games: story.games,
      objectLesson: story.objectLesson,
      coloringPage: story.coloringPage,
      prayer: story.prayer,
      illustration: { url: story.image, prompt: "" },
      illustrationStyle: null,
      activeModules: input.activeModules,
      durationMinutes: computeDuration(input.activeModules),
      status: "ready",
      contentStatus: "ok",
      reviewRequired: false,
      validationWarnings: [],
    });
  },

  /** Workflow B: AI-generate a lesson from a free-text Bible passage. */
  /**
   * Full AI lesson generation (Prompt 10), now tracked through
   * GenerationJob's queued -> generating -> validating -> generating-media
   * -> ready|failed state machine rather than being a bare synchronous
   * call with no record of it happening. Two concrete things this buys:
   * - **Duplicate-request prevention**: if this owner already has an
   *   in-flight generation from the last two minutes, this rejects the new
   *   one instead of running two expensive AI calls for what's almost
   *   certainly a double-tap or a retried request.
   * - **Generation history**: every attempt — including failures — leaves
   *   a record with its input and, on success, which lesson it produced.
   */
  async createFromAi(ownerId: string | null, input: GenerateLessonInput) {
    if (ownerId) {
      const activeJob = await generationJobRepository.findActiveForOwner(ownerId, "lesson");
      if (activeJob) {
        throw AppError.validation(
          "A lesson is already being generated for you. Please wait for it to finish before starting another.",
        );
      }
    }

    const job = await generationJobRepository.create(ownerId, "lesson", input);

    try {
      const { plan, contentStatus, reviewRequired, validationWarnings } = await generateLessonPlan({
        passage: input.passage,
        ageGroup: input.ageGroup,
        style: input.style,
        styleDescription: input.styleDescription,
        focus: input.focus,
      });
      await generationJobRepository.setStatus(String(job._id), "validating");

      let illustration: { url: string; prompt: string } | null = null;
      if (input.withIllustration) {
        await generationJobRepository.setStatus(String(job._id), "generating-media");
        const url = await generateLessonIllustration(plan.illustrationPrompt);
        illustration = url ? { url, prompt: plan.illustrationPrompt } : null;
      }

      const activeModules = [...LESSON_MODULES.map((m) => m.id)] as LessonModuleId[];

      const lesson = await lessonRepository.create({
        ownerId,
        source: "custom",
        storyId: null,
        title: plan.title,
        bibleReference: input.passage,
        ageGroup: input.ageGroup,
        theme: input.focus || "",
        bigIdea: plan.bigIdea,
        story: plan.summary,
        askThem: plan.askThem,
        memoryVerse: plan.memoryVerse,
        games: [plan.game],
        objectLesson: plan.objectLesson,
        coloringPage: illustration
          ? { image: illustration.url, alt: plan.coloringIdea, caption: plan.coloringIdea }
          : null,
        prayer: plan.prayer,
        illustration,
        illustrationStyle: input.style,
        activeModules,
        durationMinutes: computeDuration(activeModules),
        status: "ready",
        contentStatus,
        reviewRequired,
        validationWarnings,
      });

      await generationJobRepository.complete(String(job._id), String(lesson._id));
      return lesson;
    } catch (err) {
      await generationJobRepository.fail(
        String(job._id),
        err instanceof Error ? err.message : "Unknown error",
      );
      throw err;
    }
  },

  /**
   * SECURITY: a lesson is only readable by (a) its owner, or (b) anyone if
   * its visibility is "public". Anonymous or non-owner requests for a
   * private lesson get the same 404 an unknown id would — never a
   * distinguishing 403 — so existence of another user's private lesson
   * can't be inferred by probing ids. A "shared" lesson is deliberately
   * NOT made readable here — it's only reachable read-only through its own
   * token via sharingService.getByToken, a separate path, so a "shared"
   * lesson's id alone still isn't enough to read it directly.
   */
  async getById(id: string, requesterId: string | null) {
    const lesson = await lessonRepository.findById(id);
    if (!lesson) throw AppError.notFound("Lesson not found");

    const isOwner = lesson.ownerId !== null && String(lesson.ownerId) === requesterId;
    const isPublic = lesson.visibility === "public";
    if (!isOwner && !isPublic) throw AppError.notFound("Lesson not found");

    return lesson;
  },

  async listForOwner(ownerId: string, opts: { status?: string; favorite?: boolean; archived?: boolean; page: number; limit: number }) {
    return lessonRepository.findManyForOwner(ownerId, opts);
  },

  async updateModules(id: string, ownerId: string | null, activeModules: LessonModuleId[]) {
    const lesson = await lessonRepository.updateById(id, ownerId, {
      activeModules,
      durationMinutes: computeDuration(activeModules),
    });
    if (!lesson) throw AppError.notFound("Lesson not found");
    return lesson;
  },

  /**
   * Reorders the active modules (Prompt 09/14 "Move" / drag-and-drop). The
   * given order must be exactly the same set of modules the lesson already
   * has active — this endpoint changes order, not membership; use
   * updateModules to turn modules on/off.
   */
  async reorderModules(id: string, ownerId: string | null, order: LessonModuleId[]) {
    const existing = await lessonRepository.findByIdForOwner(id, ownerId);
    if (!existing) throw AppError.notFound("Lesson not found");

    const current = new Set(existing.activeModules as unknown as LessonModuleId[]);
    const incoming = new Set(order);
    const sameMembership =
      current.size === incoming.size && [...current].every((m) => incoming.has(m));
    if (!sameMembership) {
      throw AppError.validation(
        "Reorder must include exactly the modules that are currently active — use the modules endpoint to add or remove one.",
      );
    }

    const lesson = await lessonRepository.updateById(id, ownerId, { activeModules: order });
    if (!lesson) throw AppError.notFound("Lesson not found");
    return lesson;
  },

  /**
   * Direct content edits from the Lesson Editor. Simple text/list edits only
   * — never triggers AI regeneration, and never touches activeModules,
   * status, or ownership. Requires ownership (no guest editing of saved
   * content). `coloringPage` in the input is caption-only (that's the only
   * field the editor lets a person change), so it's merged onto the
   * existing image/alt rather than replacing the whole sub-document.
   */
  async updateContent(id: string, ownerId: string, patch: UpdateLessonContentInput) {
    const { coloringPage, ...rest } = patch;
    let mergedColoringPage: { image: string; alt: string; caption: string } | undefined;

    if (coloringPage) {
      const existing = await lessonRepository.findByIdForOwner(id, ownerId);
      if (!existing) throw AppError.notFound("Lesson not found");
      if (!existing.coloringPage) {
        throw AppError.validation("This lesson has no coloring page to edit.");
      }
      mergedColoringPage = {
        image: existing.coloringPage.image ?? "",
        alt: existing.coloringPage.alt ?? "",
        caption: coloringPage.caption,
      };
    }

    const lesson = await lessonRepository.updateById(id, ownerId, {
      ...rest,
      ...(mergedColoringPage ? { coloringPage: mergedColoringPage } : {}),
    });
    if (!lesson) throw AppError.notFound("Lesson not found");
    return lesson;
  },

  /** Duplicate lesson (Prompt 14) — creates an independent, editable copy owned by the caller. */
  async duplicate(id: string, ownerId: string) {
    const original = await lessonRepository.findByIdForOwner(id, ownerId);
    if (!original) throw AppError.notFound("Lesson not found");

    return lessonRepository.create({
      ownerId,
      source: original.source,
      storyId: original.storyId ? String(original.storyId) : null,
      title: `${original.title} (copy)`,
      bibleReference: original.bibleReference,
      ageGroup: original.ageGroup,
      theme: original.theme,
      bigIdea: original.bigIdea,
      story: original.story,
      askThem: original.askThem,
      memoryVerse: original.memoryVerse,
      games: original.games,
      objectLesson: original.objectLesson,
      coloringPage: original.coloringPage
        ? {
            image: original.coloringPage.image ?? "",
            alt: original.coloringPage.alt ?? "",
            caption: original.coloringPage.caption ?? "",
          }
        : null,
      prayer: original.prayer,
      illustration: original.illustration ?? null,
      illustrationStyle: original.illustrationStyle ?? null,
      activeModules: original.activeModules,
      durationMinutes: original.durationMinutes,
      status: "ready",
      contentStatus: original.contentStatus,
      reviewRequired: original.reviewRequired,
      validationWarnings: original.validationWarnings,
      isFavorite: false,
      isArchived: false,
    });
  },

  /**
   * Version snapshots (Prompt 14 "Save version" / "Restore version"). A
   * snapshot captures every field the editor can change, so restoring one
   * fully reverts content edits, module toggles, and module order.
   */
  async saveVersion(id: string, ownerId: string, label: string) {
    const lesson = await lessonRepository.findByIdForOwner(id, ownerId);
    if (!lesson) throw AppError.notFound("Lesson not found");

    const snapshot = {
      title: lesson.title,
      bigIdea: lesson.bigIdea,
      story: lesson.story,
      askThem: lesson.askThem,
      memoryVerse: lesson.memoryVerse,
      games: lesson.games,
      objectLesson: lesson.objectLesson,
      coloringPage: lesson.coloringPage,
      prayer: lesson.prayer,
      activeModules: lesson.activeModules,
      durationMinutes: lesson.durationMinutes,
    };

    return lessonVersionRepository.create(id, snapshot, label);
  },

  async listVersions(id: string, ownerId: string) {
    const lesson = await lessonRepository.findByIdForOwner(id, ownerId);
    if (!lesson) throw AppError.notFound("Lesson not found");
    return lessonVersionRepository.findManyForLesson(id);
  },

  /**
   * Restoring is itself non-destructive: the lesson's current state is saved
   * as an automatic "Before restore" version first, so restoring an old
   * version is always undoable by restoring again.
   */
  async restoreVersion(id: string, ownerId: string, versionId: string) {
    const lesson = await lessonRepository.findByIdForOwner(id, ownerId);
    if (!lesson) throw AppError.notFound("Lesson not found");

    const version = await lessonVersionRepository.findByIdForLesson(versionId, id);
    if (!version) throw AppError.notFound("Version not found");

    await lessonService.saveVersion(id, ownerId, "Before restore");

    const snapshot = version.snapshot as Record<string, unknown>;
    const restored = await lessonRepository.updateById(id, ownerId, snapshot);
    if (!restored) throw AppError.notFound("Lesson not found");
    return restored;
  },

  /**
   * Regenerate a single module with AI (Prompt 10 / Prompt 14). Auto-saves a
   * "Before regenerate" version first — same safety net as restoreVersion —
   * so an AI rewrite the teacher doesn't like is always one Restore away
   * from undone. The regenerated module is marked reviewRequired, same as
   * a freshly AI-generated lesson (Prompt 11): it's never silently trusted.
   */
  async regenerateModule(
    id: string,
    ownerId: string,
    moduleId: RegeneratableModule,
    instruction: string,
  ) {
    const lesson = await lessonRepository.findByIdForOwner(id, ownerId);
    if (!lesson) throw AppError.notFound("Lesson not found");

    if (moduleId === "coloring" && !lesson.coloringPage?.image) {
      throw AppError.validation(
        "This lesson has no coloring page image yet, so its caption can't be regenerated.",
      );
    }

    const { data: output, bibleWarnings } = await regenerateModuleContent(moduleId, {
      title: lesson.title,
      bibleReference: lesson.bibleReference,
      bigIdea: lesson.bigIdea,
      ageGroup: lesson.ageGroup,
      instruction,
    });

    await lessonService.saveVersion(id, ownerId, "Before regenerate");

    const patch = moduleContentToPatch(moduleId, output, lesson.coloringPage);

    const updated = await lessonRepository.updateById(id, ownerId, {
      ...patch,
      contentStatus: "review_required",
      reviewRequired: true,
      validationWarnings:
        bibleWarnings.length > 0 ? [...lesson.validationWarnings, ...bibleWarnings] : lesson.validationWarnings,
    });
    if (!updated) throw AppError.notFound("Lesson not found");
    return updated;
  },

  /**
   * Generate (or regenerate) the coloring page image with AI (Prompt 13).
   * Unlike regenerateModule, this only ever touches lesson.coloringPage —
   * it never marks the lesson reviewRequired, since an image isn't a
   * Scripture-accuracy concern the way generated text is. Saves a version
   * first so a coloring page a teacher doesn't like is still one Restore
   * away from the old one.
   */
  async generateColoringPage(id: string, ownerId: string, instruction: string) {
    const lesson = await lessonRepository.findByIdForOwner(id, ownerId);
    if (!lesson) throw AppError.notFound("Lesson not found");

    const scenePrompt = [
      `${lesson.title} (${lesson.bibleReference})`,
      lesson.bigIdea,
      instruction || lesson.coloringPage?.caption || "",
    ]
      .filter(Boolean)
      .join(". ");

    const image = await generateColoringPage(scenePrompt);

    await lessonService.saveVersion(id, ownerId, "Before coloring page generation");

    const updated = await lessonRepository.updateById(id, ownerId, {
      coloringPage: {
        image,
        alt: `Coloring page for ${lesson.title}`,
        caption: lesson.coloringPage?.caption || `Color the scene from ${lesson.title}.`,
      },
    });
    if (!updated) throw AppError.notFound("Lesson not found");
    return updated;
  },

  async setFavorite(id: string, ownerId: string, isFavorite: boolean) {
    const lesson = await lessonRepository.updateById(id, ownerId, { isFavorite });
    if (!lesson) throw AppError.notFound("Lesson not found");
    return lesson;
  },

  async setArchived(id: string, ownerId: string, isArchived: boolean) {
    const lesson = await lessonRepository.updateById(id, ownerId, { isArchived });
    if (!lesson) throw AppError.notFound("Lesson not found");
    return lesson;
  },

  async remove(id: string, ownerId: string) {
    const lesson = await lessonRepository.deleteById(id, ownerId);
    if (!lesson) throw AppError.notFound("Lesson not found");
  },
};
