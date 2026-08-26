import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../config/logger.js";
import { NARRATION_STYLES } from "@ksb/constants";
import type { NarrationStyleId } from "@ksb/types";

/**
 * Generates narration audio directly using the OpenAI Text-to-Speech API.
 * Returns the raw MP3 Response.
 */
export async function requestNarrationAudio(input: {
  text: string;
  voice: string;
  style: NarrationStyleId;
}): Promise<Response> {
  if (!env.OPENAI_API_KEY) {
    throw AppError.audioGenerationFailed(
      "OpenAI API key is not configured."
    );
  }

  const instructions =
    NARRATION_STYLES.find(
      (narrationStyle) => narrationStyle.id === input.style
    )?.instructions ?? NARRATION_STYLES[0]!.instructions;

  logger.info(
    {
      voice: input.voice,
      style: input.style,
      textLength: input.text.length,
    },
    "Sending narration request to OpenAI TTS"
  );

  let response: Response;

  try {
    response = await fetch(
      "https://api.openai.com/v1/audio/speech",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: "tts-1",
          input: input.text,
          voice: input.voice,
          response_format: "mp3",
        }),
      }
    );
  } catch (error) {
    logger.error(
      {
        error,
        voice: input.voice,
        style: input.style,
      },
      "Failed to connect to OpenAI TTS"
    );

    throw AppError.audioGenerationFailed(
      "Unable to connect to the OpenAI narration service. Please try again."
    );
  }

  logger.info(
    {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
    },
    "OpenAI TTS response received"
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");

    logger.error(
      {
        status: response.status,
        statusText: response.statusText,
        detail,
      },
      "OpenAI TTS request failed"
    );

    let message =
      "The narration could not be generated. Please try again.";

    if (response.status === 400) {
      message =
        "The narration request is invalid. Please check the text or selected voice.";
    } else if (response.status === 401 || response.status === 403) {
      message =
        "OpenAI authentication failed. Please check the OPENAI_API_KEY.";
    } else if (response.status === 429) {
      message =
        "OpenAI rate limit or billing limit reached. Please try again later.";
    } else if (response.status >= 500) {
      message =
        "OpenAI narration service is temporarily unavailable. Please try again later.";
    }

    throw AppError.audioGenerationFailed(message);
  }

  logger.info(
    {
      voice: input.voice,
      style: input.style,
      textLength: input.text.length,
    },
    "OpenAI narration generated successfully"
  );

  return response;
}