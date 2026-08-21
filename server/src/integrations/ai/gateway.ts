import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../config/logger.js";

/**
 * Thin wrapper around the same AI gateway the prototype used
 * (ai.gateway.lovable.dev). Kept isolated in integrations/ai so the rest of
 * the backend never talks to a specific AI vendor directly — swapping
 * providers later only touches this file.
 */

function apiKey(): string {
  if (!env.LOVABLE_API_KEY) {
    throw AppError.aiGenerationFailed("AI is not configured yet. Missing LOVABLE_API_KEY.");
  }
  return env.LOVABLE_API_KEY;
}

type GatewayResponse = {
  choices: {
    message: { content?: string | null; images?: { image_url: { url: string } }[] };
  }[];
};

async function callGateway(body: Record<string, unknown>): Promise<GatewayResponse> {
  const res = await fetch(env.AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw AppError.aiGenerationFailed("Too many requests right now — please try again in a moment.");
  }
  if (res.status === 402) {
    throw AppError.aiGenerationFailed("AI credits are exhausted. Add credits in Settings → Plans & credits.");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    logger.error({ status: res.status, detail }, "AI gateway request failed");
    throw AppError.aiGenerationFailed("The AI request failed. Please try again.");
  }
  return res.json() as Promise<GatewayResponse>;
}

/** Raw text-completion call. The caller is responsible for schema validation. */
export async function requestSermonPlanJson(input: {
  passage: string;
  ageGroup: string;
  style: string;
  styleDescription: string;
  focus: string;
  repairNote?: string;
}): Promise<string> {
  const data = await callGateway({
    model: "google/gemini-3.6-flash",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an experienced children's ministry leader. You write warm, accurate, age-appropriate Bible teaching for kids. Never invent Scripture: quote verses faithfully and keep references correct. Reply with json only.",
      },
      {
        role: "user",
        content: `Create a children's sermon from this Bible passage: "${input.passage}".
Audience: ${input.ageGroup}.
${input.focus ? `Teaching focus the leader asked for: ${input.focus}.` : ""}
Illustration style for any artwork: ${input.style} (${input.styleDescription}).
${input.repairNote ? `\nIMPORTANT: ${input.repairNote}` : ""}

Return json with exactly these keys:
{
  "title": short kid-friendly story title,
  "bigIdea": one short sentence takeaway,
  "summary": array of 3-4 short paragraphs retelling the passage for kids,
  "askThem": array of 3 discussion questions,
  "memoryVerse": { "text": short verse text, "reference": book chapter:verse, "motions": array of 3-4 hand motion cues formatted as "\\"phrase\\" — motion" },
  "game": { "title": string, "minutes": number, "supplies": string, "steps": array of 3 steps },
  "objectLesson": { "title": string, "minutes": number, "supplies": string, "steps": array of 3 steps },
  "coloringIdea": one sentence describing the coloring page scene,
  "prayer": a short closing prayer,
  "illustrationPrompt": a vivid image prompt for the story scene written in the ${input.style} style, no text in the image
}`,
      },
    ],
  });

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw AppError.aiGenerationFailed("The AI returned an empty plan. Please try again.");
  return content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
}

export async function generateIllustration(prompt: string): Promise<string> {
  const data = await callGateway({
    model: "google/gemini-2.5-flash-image",
    modalities: ["image", "text"],
    messages: [
      {
        role: "user",
        content: `${prompt}. Child-friendly, gentle, reverent, no text or lettering anywhere in the image.`,
      },
    ],
  });

  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw AppError.imageGenerationFailed("The illustration could not be generated. Please try again.");
  return url;
}

/**
 * Coloring pages (Prompt 13) need a distinct prompt from the storybook
 * illustration: pure black-and-white line art, no color or shading at all,
 * large simple shapes a child can actually color inside, printer-friendly.
 * Kept as its own gateway call (rather than reusing generateIllustration)
 * so the prompt engineering for "coloring page" doesn't leak into or get
 * diluted by the illustration prompt.
 */
export async function generateColoringPageImage(scenePrompt: string): Promise<string> {
  const data = await callGateway({
    model: "google/gemini-2.5-flash-image",
    modalities: ["image", "text"],
    messages: [
      {
        role: "user",
        content: `Black-and-white line-art coloring page for children, illustrating: ${scenePrompt}. Bold clean outlines only, pure white background, no shading, no gradients, no color, no gray fill, no text or lettering anywhere, large simple uncluttered shapes that are easy for a young child to color inside, printer-friendly.`,
      },
    ],
  });

  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) {
    throw AppError.imageGenerationFailed("The coloring page could not be generated. Please try again.");
  }
  return url;
}

/**
 * Regenerates a single lesson module (Prompt 10/14 "Regenerate module").
 * `promptBody` is the module-specific instructions + JSON shape built by
 * the caller (lessonService knows the schema per module); this function
 * just handles the gateway round-trip and repair note plumbing, same as
 * requestSermonPlanJson does for the full lesson.
 */
export async function requestModuleRegenerationJson(input: {
  context: string;
  promptBody: string;
  instruction: string;
  repairNote?: string;
}): Promise<string> {
  const data = await callGateway({
    model: "google/gemini-3.6-flash",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an experienced children's ministry leader revising one section of an existing children's sermon. You write warm, accurate, age-appropriate Bible teaching for kids. Never invent Scripture: quote verses faithfully and keep references correct. Reply with json only.",
      },
      {
        role: "user",
        content: `${input.context}
${input.instruction ? `\nThe teacher asked for this change: ${input.instruction}` : "\nMake a fresh alternative version — vary the wording and approach from what's there now."}
${input.repairNote ? `\nIMPORTANT: ${input.repairNote}` : ""}

${input.promptBody}`,
      },
    ],
  });

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw AppError.aiGenerationFailed("The AI returned an empty response. Please try again.");
  return content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
}
