// import { env } from "../../config/env.js";
// import { AppError } from "../../utils/AppError.js";
// import { logger } from "../../config/logger.js";
// import { NARRATION_STYLES } from "@ksb/constants";
// import type { NarrationStyleId } from "@ksb/types";

// /** Returns a raw audio/mpeg stream (Response) from the TTS gateway. */
// export async function requestNarrationAudio(input: {
//   text: string;
//   voice: string;
//   style: NarrationStyleId;
// }): Promise<Response> {
//   if (!env.LOVABLE_API_KEY) {
//     throw AppError.audioGenerationFailed("Narration is not configured yet.");
//   }

//   const instructions =
//     NARRATION_STYLES.find((s) => s.id === input.style)?.instructions ?? NARRATION_STYLES[0]!.instructions;

//   const res = await fetch(env.TTS_GATEWAY_URL, {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${env.LOVABLE_API_KEY}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       model: "openai/gpt-4o-mini-tts",
//       input: input.text,
//       voice: input.voice,
//       response_format: "mp3",
//       instructions,
//     }),
//   });

//   if (!res.ok) {
//     const detail = await res.text().catch(() => "");
//     logger.error({ status: res.status, detail }, "TTS gateway request failed");
//     const message =
//       res.status === 402
//         ? "AI credits are exhausted. Add credits in Settings → Plans & credits."
//         : res.status === 429
//           ? "Too many requests right now — please try again in a moment."
//           : "The narration could not be generated. Please try again.";
//     throw AppError.audioGenerationFailed(message);
//   }

//   return res;
// }


import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../config/logger.js";
import { NARRATION_STYLES } from "@ksb/constants";
import type { NarrationStyleId } from "@ksb/types";

/**
 * Generates narration audio through the configured TTS gateway.
 */
export async function requestNarrationAudio(input: {
  text: string;
  voice: string;
  style: NarrationStyleId;
}): Promise<Response> {
  if (!env.LOVABLE_API_KEY) {
    logger.error("LOVABLE_API_KEY is missing");
    throw AppError.audioGenerationFailed(
      "Narration is not configured yet.",
  );
  }

  const instructions =
    NARRATION_STYLES.find(
      (s) => s.id === input.style,
    )?.instructions ??
    NARRATION_STYLES[0]!.instructions;

  logger.info(
    {
      gateway: env.TTS_GATEWAY_URL,
      voice: input.voice,
      style: input.style,
      textLength: input.text.length,
      hasApiKey: Boolean(env.LOVABLE_API_KEY),
    },
    "Sending narration request to TTS gateway",
  );

  let res: Response;

  try {
    res = await fetch(env.TTS_GATEWAY_URL, {
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
  } catch (error) {
    logger.error(
      {
        error,
        gateway: env.TTS_GATEWAY_URL,
      },
      "Could not connect to TTS gateway",
    );

    throw AppError.audioGenerationFailed(
      "Could not connect to the narration service. Please try again.",
    );
  }

  logger.info(
    {
      status: res.status,
      statusText: res.statusText,
      contentType: res.headers.get("content-type"),
    },
    "TTS gateway response received",
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");

    logger.error(
      {
        status: res.status,
        statusText: res.statusText,
        detail,
      },
      "TTS gateway request failed",
    );

    if (res.status === 401 || res.status === 403) {
      throw AppError.audioGenerationFailed(
        "The narration service authentication failed. Please check the AI API key.",
      );
    }

    if (res.status === 402) {
      throw AppError.audioGenerationFailed(
        "AI credits are exhausted. Please add credits to the AI service.",
      );
    }

    if (res.status === 429) {
      throw AppError.audioGenerationFailed(
        "Too many narration requests right now. Please wait a moment and try again.",
      );
    }

    if (res.status >= 500) {
      throw AppError.audioGenerationFailed(
        "The narration service is temporarily unavailable. Please try again.",
      );
    }

    throw AppError.audioGenerationFailed(
      "The narration could not be generated. Please try again.",
    );
  }

  return res;
}




