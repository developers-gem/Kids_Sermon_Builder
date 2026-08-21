import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../config/logger.js";
import { NARRATION_STYLES } from "@ksb/constants";
import type { NarrationStyleId } from "@ksb/types";

/** Returns a raw audio/mpeg stream (Response) from the TTS gateway. */
export async function requestNarrationAudio(input: {
  text: string;
  voice: string;
  style: NarrationStyleId;
}): Promise<Response> {
  if (!env.LOVABLE_API_KEY) {
    throw AppError.audioGenerationFailed("Narration is not configured yet.");
  }

  const instructions =
    NARRATION_STYLES.find((s) => s.id === input.style)?.instructions ?? NARRATION_STYLES[0]!.instructions;

  const res = await fetch(env.TTS_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini-tts",
      input: input.text,
      voice: input.voice,
      response_format: "mp3",
      instructions,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    logger.error({ status: res.status, detail }, "TTS gateway request failed");
    const message =
      res.status === 402
        ? "AI credits are exhausted. Add credits in Settings → Plans & credits."
        : res.status === 429
          ? "Too many requests right now — please try again in a moment."
          : "The narration could not be generated. Please try again.";
    throw AppError.audioGenerationFailed(message);
  }

  return res;
}
