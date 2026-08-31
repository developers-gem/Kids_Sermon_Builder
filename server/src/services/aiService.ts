import {
  AiSermonPlanSchema,
  type AiSermonPlan,
  RegenerateStorySchema,
  RegenerateVerseSchema,
  RegenerateGamesSchema,
  RegenerateObjectLessonSchema,
  RegenerateColoringSchema,
  RegeneratePrayerSchema,
} from "@ksb/validation";
import type { ZodTypeAny } from "zod";
import {
  requestSermonPlanJson,
  generateIllustration,
  generateColoringPageImage,
  requestModuleRegenerationJson,
} from "../integrations/ai/gateway.js";
import { validateBibleContent } from "./bibleValidationService.js";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/AppError.js";

export type GenerateLessonPlanInput = {
  passage: string;
  ageGroup: string;
  style: string;
  styleDescription: string;
  focus: string;
};

export type GenerateLessonPlanResult = {
  plan: AiSermonPlan;
  illustrationUrl: string | null;
  contentStatus: "ok" | "review_required";
  reviewRequired: boolean;
  validationWarnings: string[];
};

function tryParse(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Generates and validates an AI sermon plan.
 *
 * Flow (per Prompt 10 / Prompt 11):
 *   request -> parse JSON -> validate against AiSermonPlanSchema
 *   -> if invalid, retry once with an explicit repair instruction
 *   -> if still invalid, fail with AI_GENERATION_FAILED (never pass
 *      unvalidated content back to the client)
 *   -> run the dedicated Bible content validation pass (bibleValidationService)
 *   -> if it flags a fabricated/unrecognized reference, retry once more
 *      specifically asking the AI to correct the reference
 *
 * The AI is never trusted blindly: every generated lesson is marked
 * reviewRequired, and the specific, mechanically-checked reasons why are
 * surfaced in validationWarnings rather than one generic disclaimer.
 */
export async function generateLessonPlan(
  input: GenerateLessonPlanInput,
): Promise<GenerateLessonPlanResult> {
  const warnings: string[] = [];

  let raw = await requestSermonPlanJson(input);
  let parsed = tryParse(raw);
  let result = parsed ? AiSermonPlanSchema.safeParse(parsed) : null;

  if (!result?.success) {
    logger.warn({ issues: result?.error?.flatten() }, "AI sermon plan failed validation, retrying once");
    raw = await requestSermonPlanJson({
      ...input,
      repairNote:
        "Your previous response did not match the required JSON schema exactly. Return ONLY valid JSON matching every key and type listed below, with no markdown fences and no extra commentary.",
    });
    parsed = tryParse(raw);
    result = parsed ? AiSermonPlanSchema.safeParse(parsed) : null;
    warnings.push("Content required one automatic regeneration to match the expected format.");
  }

  if (!result?.success) {
    throw new Error("The AI returned an unexpected format after retrying. Please try again.");
  }

  let plan = result.data;
  let bibleCheck = validateBibleContent({
    requestedPassage: input.passage,
    ageGroup: input.ageGroup,
    generatedReference: plan.memoryVerse.reference,
    memoryVerseText: plan.memoryVerse.text,
    storyParagraphs: plan.summary,
  });

  if (bibleCheck.referenceUnrecognized) {
    logger.warn(
      { requestedPassage: input.passage, generatedReference: plan.memoryVerse.reference },
      "Generated memory verse reference did not resolve to a known Bible book, retrying once",
    );
    raw = await requestSermonPlanJson({
      ...input,
      repairNote: `Your memory verse reference "${plan.memoryVerse.reference}" does not match a real book of the Bible. Use the passage the teacher actually requested (${input.passage}) or a verse clearly within it, and double-check the book name is spelled correctly.`,
    });
    parsed = tryParse(raw);
    const retryResult = parsed ? AiSermonPlanSchema.safeParse(parsed) : null;
    if (retryResult?.success) {
      plan = retryResult.data;
      bibleCheck = validateBibleContent({
        requestedPassage: input.passage,
        ageGroup: input.ageGroup,
        generatedReference: plan.memoryVerse.reference,
        memoryVerseText: plan.memoryVerse.text,
        storyParagraphs: plan.summary,
      });
    }
    // If the retry also fails schema validation, we deliberately keep the
    // first successfully-parsed plan rather than failing the whole request
    // over an unresolved reference — it's surfaced as a warning instead,
    // consistent with Prompt 10's "never lose user content over an optional
    // check failing."
  }

  warnings.push(...bibleCheck.warnings);
  const illustrationUrl = await generateLessonIllustration(
  plan.illustrationPrompt,
);

  return {
    illustrationUrl,
    plan,
    contentStatus: "review_required",
    reviewRequired: true,
    validationWarnings: warnings,
  };
}
 
export async function generateLessonIllustration(prompt: string): Promise<string | null> {
  try {
    return await generateIllustration(prompt);
  } catch (err) {
    // Illustration failures must never destroy the lesson (Prompt 10 requirement).
    logger.warn({ err }, "Illustration generation failed; continuing without it");
    return null;
  }
}

/**
 * Unlike generateLessonIllustration, this one is NOT silently swallowed —
 * coloring-page generation is an explicit, standalone action the teacher
 * asked for (Prompt 13 "Coloring page generation"), not an optional add-on
 * bundled into a bigger request, so a failure here should surface as a
 * real error rather than quietly returning nothing.
 */
export async function generateColoringPage(scenePrompt: string): Promise<string> {
  return generateColoringPageImage(scenePrompt);
}

// ---------------------------------------------------------------------------
// Regenerate module (Prompt 10 / Prompt 14)
// ---------------------------------------------------------------------------

export type RegeneratableModule = "story" | "verse" | "games" | "object" | "coloring" | "prayer";

export type RegenerateModuleContext = {
  title: string;
  bibleReference: string;
  bigIdea: string;
  ageGroup: string;
  instruction: string;
};

/** The JSON-shape instructions sent to the AI, one per module. */
const MODULE_PROMPT_BODY: Record<RegeneratableModule, string> = {
  story: `Return json with exactly these keys:
{
  "story": array of 3-4 short paragraphs retelling the passage for kids,
  "askThem": array of 3 discussion questions
}`,
  verse: `Return json with exactly these keys:
{
  "memoryVerse": { "text": short verse text, "reference": book chapter:verse, "motions": array of 3-4 hand motion cues formatted as "\\"phrase\\" — motion" }
}`,
  games: `Return json with exactly these keys:
{
  "games": array of 1 game, each { "title": string, "minutes": number, "supplies": string, "steps": array of 3 steps }
}`,
  object: `Return json with exactly these keys:
{
  "objectLesson": { "title": string, "minutes": number, "supplies": string, "steps": array of 3 steps }
}`,
  coloring: `Return json with exactly these keys:
{
  "caption": one sentence describing the coloring page scene, written as an instruction to a teacher (e.g. "Ark & rainbow — add a color for each promise you can name.")
}`,
  prayer: `Return json with exactly these keys:
{
  "prayer": a short closing prayer
}`,
};

const MODULE_SCHEMA: Record<RegeneratableModule, ZodTypeAny> = {
  story: RegenerateStorySchema,
  verse: RegenerateVerseSchema,
  games: RegenerateGamesSchema,
  object: RegenerateObjectLessonSchema,
  coloring: RegenerateColoringSchema,
  prayer: RegeneratePrayerSchema,
};

/**
 * Regenerates one lesson module in isolation. Same validate -> repair-retry
 * -> fail discipline as the full-lesson generator (Prompt 11) — never
 * returns unvalidated AI output, and never touches any other module.
 *
 * For "verse" and "story" — the two modules that actually contain Scripture
 * wording — this also runs the dedicated Bible content validation pass and
 * returns whatever warnings it raises, same as full-lesson generation. The
 * other four modules (games, object lesson, coloring caption, prayer) don't
 * touch Scripture text, so no Bible check applies to them.
 */
export async function regenerateModule(
  moduleId: RegeneratableModule,
  ctx: RegenerateModuleContext,
): Promise<{ data: unknown; bibleWarnings: string[] }> {
  const schema = MODULE_SCHEMA[moduleId];
  const promptBody = MODULE_PROMPT_BODY[moduleId];
  const context = `Lesson: "${ctx.title}" from ${ctx.bibleReference}. Big idea: ${ctx.bigIdea}. Audience: ${ctx.ageGroup}.`;

  let raw = await requestModuleRegenerationJson({ context, promptBody, instruction: ctx.instruction });
  let parsed = tryParse(raw);
  let result = parsed ? schema.safeParse(parsed) : null;

  if (!result?.success) {
    logger.warn(
      { moduleId, issues: result?.error?.flatten() },
      "Module regeneration failed validation, retrying once",
    );
    raw = await requestModuleRegenerationJson({
      context,
      promptBody,
      instruction: ctx.instruction,
      repairNote:
        "Your previous response did not match the required JSON schema exactly. Return ONLY valid JSON matching every key and type listed below, with no markdown fences and no extra commentary.",
    });
    parsed = tryParse(raw);
    result = parsed ? schema.safeParse(parsed) : null;
  }

  if (!result?.success) {
    throw AppError.aiGenerationFailed(
      "The AI returned an unexpected format after retrying. Please try again.",
    );
  }

  let data = result.data;
  const bibleWarnings: string[] = [];

  if (moduleId === "verse") {
    const { memoryVerse } = data as { memoryVerse: { text: string; reference: string } };
    let check = validateBibleContent({
      requestedPassage: ctx.bibleReference,
      ageGroup: ctx.ageGroup,
      generatedReference: memoryVerse.reference,
      memoryVerseText: memoryVerse.text,
    });

    if (check.referenceUnrecognized) {
      raw = await requestModuleRegenerationJson({
        context,
        promptBody,
        instruction: ctx.instruction,
        repairNote: `Your memory verse reference "${memoryVerse.reference}" does not match a real book of the Bible. Use the lesson's own passage (${ctx.bibleReference}) or a verse clearly within it.`,
      });
      parsed = tryParse(raw);
      const retry = parsed ? schema.safeParse(parsed) : null;
      if (retry?.success) {
        data = retry.data;
        const retryVerse = (data as { memoryVerse: { text: string; reference: string } }).memoryVerse;
        check = validateBibleContent({
          requestedPassage: ctx.bibleReference,
          ageGroup: ctx.ageGroup,
          generatedReference: retryVerse.reference,
          memoryVerseText: retryVerse.text,
        });
      }
    }
    bibleWarnings.push(...check.warnings);
  }

  if (moduleId === "story") {
    const { story } = data as { story: string[] };
    const check = validateBibleContent({
      requestedPassage: ctx.bibleReference,
      ageGroup: ctx.ageGroup,
      generatedReference: ctx.bibleReference,
      storyParagraphs: story,
    });
    bibleWarnings.push(...check.warnings);
  }

  return { data, bibleWarnings };
}
