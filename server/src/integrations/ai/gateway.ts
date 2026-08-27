import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../config/logger.js";

function apiKey(): string {
  if (!env.OPENAI_API_KEY) {
    throw AppError.aiGenerationFailed("AI is not configured yet. Missing OPENAI_API_KEY.");
  }
  return env.OPENAI_API_KEY;
}
 
type ChatResponse = {
  choices: {
    message: { content: string };
  }[];
};

type ImageResponse = {
  data: {
    b64_json?: string;
    url?: string;
  }[];
};

async function callOpenAIChat(body: Record<string, unknown>): Promise<ChatResponse> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey()}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw AppError.aiGenerationFailed("Too many requests right now — please try again in a moment.");
  }
  if (res.status === 402) {
    throw AppError.aiGenerationFailed("AI credits are exhausted.");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    logger.error({ status: res.status, detail }, "OpenAI chat request failed");
    throw AppError.aiGenerationFailed("The AI request failed. Please try again.");
  }
  return res.json() as Promise<ChatResponse>;
}

// async function callOpenAIImage(prompt: string): Promise<string> {
//   const res = await fetch("https://api.openai.com/v1/images/generations", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": `Bearer ${apiKey()}`,
//     },
//     body: JSON.stringify({
//       model: "gpt-image-1",
//       prompt,
//       // n: 1,
//       size: "1024x1024",
//     }),
//   });

//   if (!res.ok) {
//     const detail = await res.text().catch(() => "");
//     logger.error({ status: res.status, detail }, "OpenAI image request failed");
//     throw AppError.imageGenerationFailed("The image could not be generated. Please try again.");
//   }

//   const data = (await res.json()) as ImageResponse;
//   const url = data.data?.[0]?.url;
//   if (!url) throw AppError.imageGenerationFailed("The image could not be generated. Please try again.");
//   return url;
// }

async function callOpenAIImage(prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    }),
  });

  const raw = await res.text();

  if (!res.ok) {
    logger.error(
      {
        status: res.status,
        detail: raw,
      },
      "OpenAI image request failed",
    );

    throw AppError.imageGenerationFailed(
      "The image could not be generated. Please try again.",
    );
  }

  let data: ImageResponse;

  try {
    data = JSON.parse(raw) as ImageResponse;
  } catch (err) {
    logger.error(
      { err, raw },
      "Invalid JSON returned by OpenAI image API",
    );

    throw AppError.imageGenerationFailed(
      "The image service returned an invalid response.",
    );
  }

  const image = data.data?.[0];

  if (!image) {
    logger.error(
      { data },
      "OpenAI returned no image data",
    );

    throw AppError.imageGenerationFailed(
      "The image service returned no image.",
    );
  }

  // GPT Image response
  if (image.b64_json) {
    return `data:image/png;base64,${image.b64_json}`;
  }

  // Fallback if API returns a URL
  if (image.url) {
    return image.url;
  }

  logger.error(
    { data },
    "OpenAI response contained neither b64_json nor url",
  );

  throw AppError.imageGenerationFailed(
    "The image service returned an unusable image.",
  );
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
  const data = await callOpenAIChat({
    model: "gpt-4o",
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
  return callOpenAIImage(`${prompt}. Child-friendly, gentle, reverent, no text or lettering anywhere in the image.`);
}

export async function generateColoringPageImage(scenePrompt: string): Promise<string> {
  return callOpenAIImage(`Black-and-white line-art coloring page for children, illustrating: ${scenePrompt}. Bold clean outlines only, pure white background, no shading, no gradients, no color, no gray fill, no text or lettering anywhere, large simple uncluttered shapes that are easy for a young child to color inside, printer-friendly.`);
}

export async function requestModuleRegenerationJson(input: {
  context: string;
  promptBody: string;
  instruction: string;
  repairNote?: string;
}): Promise<string> {
  const data = await callOpenAIChat({
    model: "gpt-4o",
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
