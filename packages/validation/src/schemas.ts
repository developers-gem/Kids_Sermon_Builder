import { z } from "zod";
import { LESSON_MODULE_IDS } from "@ksb/types";

/** Input for POST /api/ai/generate-lesson (Workflow B: Custom Story Builder). */
export const GenerateLessonInput = z.object({
  passage: z.string().min(2).max(200),
  ageGroup: z.string().min(2).max(60),
  style: z.string().min(2).max(60),
  styleDescription: z.string().min(2).max(300),
  focus: z.string().max(200).default(""),
  withIllustration: z.boolean().default(true),
});
export type GenerateLessonInput = z.infer<typeof GenerateLessonInput>;

export const ActivitySchema = z.object({
  title: z.string().min(1),
  minutes: z.number().int().positive().max(60),
  supplies: z.string(),
  steps: z.array(z.string().min(1)).min(1).max(8),
});
export type Activity = z.infer<typeof ActivitySchema>;

/**
 * The exact shape we require the AI gateway to return. Anything that fails
 * this schema is either repaired (one retry with a stricter reminder) or the
 * request is failed with AI_GENERATION_FAILED — it is never passed through
 * to the client unvalidated (see Prompt 10 / Prompt 11 requirements).
 */
export const AiSermonPlanSchema = z.object({
  title: z.string().min(1).max(120),
  bigIdea: z.string().min(1).max(200),
  summary: z.array(z.string().min(1)).min(2).max(6),
  askThem: z.array(z.string().min(1)).min(1).max(6),
  memoryVerse: z.object({
    text: z.string().min(1),
    reference: z.string().min(1),
    motions: z.array(z.string().min(1)).min(1).max(6),
  }),
  game: ActivitySchema,
  objectLesson: ActivitySchema,
  coloringIdea: z.string().min(1),
  prayer: z.string().min(1),
  illustrationPrompt: z.string().min(1),
});
export type AiSermonPlan = z.infer<typeof AiSermonPlanSchema>;

/** Input for POST /api/lessons (Workflow A: build from an existing Story). */
export const CreateLessonFromStoryInput = z.object({
  storyId: z.string().min(1),
  activeModules: z.array(z.enum(LESSON_MODULE_IDS)).min(1),
});
export type CreateLessonFromStoryInput = z.infer<typeof CreateLessonFromStoryInput>;

export const UpdateLessonModulesInput = z.object({
  activeModules: z.array(z.enum(LESSON_MODULE_IDS)).min(1),
});
export type UpdateLessonModulesInput = z.infer<typeof UpdateLessonModulesInput>;

export const ReorderModulesInput = z.object({
  order: z.array(z.enum(LESSON_MODULE_IDS)).min(1),
});
export type ReorderModulesInput = z.infer<typeof ReorderModulesInput>;

/**
 * Direct content edits made in the Lesson Editor (Prompt 14). All fields are
 * optional so a PUT can patch just the section that was changed — the editor
 * only sends the fields the person actually touched, not the whole lesson.
 * Simple text edits never trigger AI regeneration; that's a separate,
 * explicit "Regenerate module" action (not yet built).
 */
export const UpdateLessonContentInput = z.object({
  title: z.string().min(1).max(120).optional(),
  bigIdea: z.string().min(1).max(300).optional(),
  story: z.array(z.string().min(1)).min(1).max(10).optional(),
  askThem: z.array(z.string().min(1)).min(1).max(10).optional(),
  memoryVerse: z
    .object({
      text: z.string().min(1),
      reference: z.string().min(1),
      motions: z.array(z.string().min(1)).min(1).max(8),
    })
    .optional(),
  games: z.array(ActivitySchema).max(6).optional(),
  objectLesson: ActivitySchema.optional(),
  coloringPage: z
    .object({
      caption: z.string().min(1).max(300),
    })
    .optional(),
  prayer: z.string().min(1).max(1000).optional(),
});
export type UpdateLessonContentInput = z.infer<typeof UpdateLessonContentInput>;

export const SaveVersionInput = z.object({
  label: z.string().max(120).default(""),
});
export type SaveVersionInput = z.infer<typeof SaveVersionInput>;

/**
 * POST /api/lessons/:id/modules/:moduleId/regenerate (Prompt 10/14 "Regenerate
 * module"). `instruction` is the optional free-text guidance the teacher can
 * give ("simpler for younger kids", "make the game shorter") — it never
 * changes which module gets regenerated, only how the AI approaches it.
 */
export const RegenerateModuleInput = z.object({
  instruction: z.string().max(300).default(""),
});
export type RegenerateModuleInput = z.infer<typeof RegenerateModuleInput>;

/** POST /api/lessons/:id/coloring-page/generate and .../regenerate (Prompt 13). */
export const GenerateColoringPageInput = z.object({
  instruction: z.string().max(300).default(""),
});
export type GenerateColoringPageInput = z.infer<typeof GenerateColoringPageInput>;

/**
 * One output schema per regeneratable module, matching the six Lesson Editor
 * panels (LESSON_MODULE_IDS). Same validate -> repair-retry -> fail
 * discipline as the full-lesson AI schema (Prompt 11) — regenerated content
 * is never trusted or merged into a lesson unvalidated.
 */
export const RegenerateStorySchema = z.object({
  story: z.array(z.string().min(1)).min(2).max(6),
  askThem: z.array(z.string().min(1)).min(1).max(6),
});
export type RegenerateStoryOutput = z.infer<typeof RegenerateStorySchema>;

export const RegenerateVerseSchema = z.object({
  memoryVerse: z.object({
    text: z.string().min(1),
    reference: z.string().min(1),
    motions: z.array(z.string().min(1)).min(1).max(6),
  }),
});
export type RegenerateVerseOutput = z.infer<typeof RegenerateVerseSchema>;

export const RegenerateGamesSchema = z.object({
  games: z.array(ActivitySchema).min(1).max(2),
});
export type RegenerateGamesOutput = z.infer<typeof RegenerateGamesSchema>;

export const RegenerateObjectLessonSchema = z.object({
  objectLesson: ActivitySchema,
});
export type RegenerateObjectLessonOutput = z.infer<typeof RegenerateObjectLessonSchema>;

export const RegenerateColoringSchema = z.object({
  caption: z.string().min(1).max(300),
});
export type RegenerateColoringOutput = z.infer<typeof RegenerateColoringSchema>;

export const RegeneratePrayerSchema = z.object({
  prayer: z.string().min(1).max(1000),
});
export type RegeneratePrayerOutput = z.infer<typeof RegeneratePrayerSchema>;
export const GenerateAudioInput = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().min(1).max(40),
  style: z.enum(["kid-friendly", "storyteller", "teacher"]),
});
export type GenerateAudioInput = z.infer<typeof GenerateAudioInput>;

export const RegisterInput = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const ForgotPasswordInput = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInput>;

export const ResetPasswordInput = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInput>;

export const StoryQueryInput = z.object({
  search: z.string().max(100).optional(),
  theme: z.string().max(100).optional(),
  ageGroup: z.string().max(60).optional(),
  featured: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
export type StoryQueryInput = z.infer<typeof StoryQueryInput>;

// ---------------------------------------------------------------------------
// Admin content management (Prompt 21) — built-in Bible story CRUD.
// Global content, never user content: these routes are requireAdmin-gated
// server-side (see routes/admin.routes.ts), never hidden-button-only.
// ---------------------------------------------------------------------------

const StoryColoringPageSchema = z.object({
  image: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().min(1),
});

const StoryMemoryVerseSchema = z.object({
  text: z.string().min(1),
  reference: z.string().min(1),
  motions: z.array(z.string().min(1)).min(1).max(8),
});

/** Every field required — this is the shape for creating a brand-new built-in story. */
export const CreateStoryInput = z.object({
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1).max(120),
  reference: z.string().min(1).max(100),
  theme: z.string().min(1).max(100),
  ageRange: z.string().min(1).max(60),
  image: z.string().min(1),
  imageAlt: z.string().min(1),
  bigIdea: z.string().min(1).max(300),
  tellIt: z.array(z.string().min(1)).min(1).max(10),
  askThem: z.array(z.string().min(1)).min(1).max(10),
  memoryVerse: StoryMemoryVerseSchema,
  games: z.array(ActivitySchema).min(1).max(6),
  objectLesson: ActivitySchema,
  coloringPage: StoryColoringPageSchema,
  prayer: z.string().min(1).max(1000),
  status: z.enum(["published", "draft", "archived"]).default("draft"),
  featured: z.boolean().default(false),
});
export type CreateStoryInput = z.infer<typeof CreateStoryInput>;

/** Every field optional — this is the shape for editing an existing story (patch semantics). */
export const UpdateStoryInput = CreateStoryInput.partial();
export type UpdateStoryInput = z.infer<typeof UpdateStoryInput>;

export const SetStoryStatusInput = z.object({
  status: z.enum(["published", "draft", "archived"]),
});
export type SetStoryStatusInput = z.infer<typeof SetStoryStatusInput>;

/** Admin listing sees every story regardless of status, with an optional status filter. */
export const AdminStoryQueryInput = z.object({
  status: z.enum(["published", "draft", "archived"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
export type AdminStoryQueryInput = z.infer<typeof AdminStoryQueryInput>;
