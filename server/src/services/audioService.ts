// import { createHash } from "node:crypto";
// import { AudioAsset } from "../models/AudioAsset.js";
// import { requestNarrationAudio } from "../integrations/tts/gateway.js";
// import { saveMedia } from "../integrations/storage/index.js";
// import type { NarrationStyleId } from "@ksb/types";

// function hashText(text: string): string {
//   return createHash("sha256").update(text.trim()).digest("hex").slice(0, 24);
// }

// function safePathSegment(value: string): string {
//   return value.replace(/[^a-zA-Z0-9_-]/g, "_");
// }

// export interface GetOrCreateNarrationInput {
//   lessonId: string;
//   moduleId: string;
//   text: string;
//   voice: string;
//   style: NarrationStyleId;
// }

// export interface NarrationResult {
//   url: string;
//   cached: boolean;
// }

// /**
//  * The cache-and-store flow Prompt 12 asks for, replacing "generate fresh
//  * audio on every call": look up an existing clip keyed on
//  * (lessonId, moduleId, contentHash, voice, style) — contentHash stands in
//  * for "contentVersion," so an edited section naturally gets new audio next
//  * time it's requested, without needing an explicit version counter. If the
//  * content, voice, and style all match something already generated, that
//  * clip is reused; nothing is regenerated unnecessarily.
//  */
// export async function getOrCreateNarration(input: GetOrCreateNarrationInput): Promise<NarrationResult> {
//   const contentHash = hashText(input.text);

//   const existing = await AudioAsset.findOne({
//     lessonId: input.lessonId,
//     moduleId: input.moduleId,
//     contentHash,
//     voice: input.voice,
//     style: input.style,
//   });
//   if (existing) {
//     return { url: existing.url, cached: true };
//   }

//   const upstream = await requestNarrationAudio({ text: input.text, voice: input.voice, style: input.style });
//   const buffer = Buffer.from(await upstream.arrayBuffer());

//   const filename = `${safePathSegment(input.moduleId)}-${contentHash}-${safePathSegment(input.voice)}-${safePathSegment(input.style)}.mp3`;
//   const { url } = await saveMedia(buffer, `audio/${safePathSegment(input.lessonId)}`, filename);

//   // Two concurrent requests for the exact same clip can race past the
//   // findOne above; the unique index on AudioAsset absorbs that safely.
//   try {
//     await AudioAsset.create({
//       lessonId: input.lessonId,
//       moduleId: input.moduleId,
//       voice: input.voice,
//       style: input.style,
//       contentHash,
//       url,
//     });
//   } catch (err) {
//     const isDuplicateKey = (err as { code?: number }).code === 11000;
//     if (!isDuplicateKey) throw err;
//   }

//   return { url, cached: false };
// }

// export async function listNarrationForLesson(lessonId: string) {
//   // Naturally bounded by (module × voice × style) combinations — small in
//   // practice — but capped anyway rather than left unbounded, same
//   // reasoning as lessonVersionRepository.
//   return AudioAsset.find({ lessonId }).sort({ moduleId: 1, createdAt: -1 }).limit(200);
// }


import { createHash } from "node:crypto";
import { AudioAsset } from "../models/AudioAsset.js";
import { requestNarrationAudio } from "../integrations/tts/gateway.js";
import { saveMedia } from "../integrations/storage/index.js";
import { logger } from "../config/logger.js";
import type { NarrationStyleId } from "@ksb/types";

function hashText(text: string): string {
  return createHash("sha256")
    .update(text.trim())
    .digest("hex")
    .slice(0, 24);
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export interface GetOrCreateNarrationInput {
  lessonId: string;
  moduleId: string;
  text: string;
  voice: string;
  style: NarrationStyleId;
}

export interface NarrationResult {
  url: string;
  cached: boolean;
}

/**
 * Get existing narration or generate and store a new one.
 */
export async function getOrCreateNarration(
  input: GetOrCreateNarrationInput,
): Promise<NarrationResult> {
  const contentHash = hashText(input.text);

  logger.info(
    {
      lessonId: input.lessonId,
      moduleId: input.moduleId,
      voice: input.voice,
      style: input.style,
      textLength: input.text.length,
      contentHash,
    },
    "🎙️ Starting narration generation",
  );

  // --------------------------------------------------
  // 1. Check database cache
  // --------------------------------------------------

  const existing = await AudioAsset.findOne({
    lessonId: input.lessonId,
    moduleId: input.moduleId,
    contentHash,
    voice: input.voice,
    style: input.style,
  });

  if (existing) {
    logger.info(
      {
        lessonId: input.lessonId,
        moduleId: input.moduleId,
        voice: input.voice,
        style: input.style,
        cachedUrl: existing.url,
      },
      "✅ Narration found in database cache",
    );

    console.log("==============================================");
    console.log("🎧 CACHED MP3 AUDIO URL");
    console.log(existing.url);
    console.log("==============================================");

    return {
      url: existing.url,
      cached: true,
    };
  }

  logger.info(
    {
      lessonId: input.lessonId,
      moduleId: input.moduleId,
    },
    "No cached narration found. Generating new audio...",
  );

  // --------------------------------------------------
  // 2. Generate audio from OpenAI
  // --------------------------------------------------

  let upstream: Response;

  try {
    upstream = await requestNarrationAudio({
      text: input.text,
      voice: input.voice,
      style: input.style,
    });

    logger.info(
      {
        status: upstream.status,
        contentType: upstream.headers.get("content-type"),
      },
      "✅ OpenAI TTS audio received",
    );
  } catch (error) {
    logger.error(
      {
        error,
        lessonId: input.lessonId,
        moduleId: input.moduleId,
        voice: input.voice,
        style: input.style,
      },
      "❌ OpenAI TTS generation failed",
    );

    throw error;
  }

  // --------------------------------------------------
  // 3. Convert response to Buffer
  // --------------------------------------------------

  let buffer: Buffer;

  try {
    const arrayBuffer = await upstream.arrayBuffer();

    buffer = Buffer.from(arrayBuffer);

    logger.info(
      {
        audioSizeBytes: buffer.length,
        audioSizeKB: Math.round(buffer.length / 1024),
      },
      "✅ Audio converted to Buffer",
    );

    console.log("==============================================");
    console.log("🎵 GENERATED AUDIO SIZE");
    console.log(`${buffer.length} bytes`);
    console.log("==============================================");
  } catch (error) {
    logger.error(
      {
        error,
      },
      "❌ Failed to convert OpenAI audio response to Buffer",
    );

    throw error;
  }

  // --------------------------------------------------
  // 4. Create filename
  // --------------------------------------------------

  const filename =
    `${safePathSegment(input.moduleId)}-` +
    `${contentHash}-` +
    `${safePathSegment(input.voice)}-` +
    `${safePathSegment(input.style)}.mp3`;

  const subdir = `audio/${safePathSegment(input.lessonId)}`;

  logger.info(
    {
      filename,
      subdir,
      storageDriver: process.env.STORAGE_DRIVER,
    },
    "💾 Saving generated MP3",
  );

  // --------------------------------------------------
  // 5. Save audio to S3 / local storage
  // --------------------------------------------------

  let savedMedia;

  try {
    savedMedia = await saveMedia(
      buffer,
      subdir,
      filename,
    );

    logger.info(
      {
        url: savedMedia.url,
        filename,
        storageDriver: process.env.STORAGE_DRIVER,
      },
      "✅ MP3 successfully saved",
    );

    console.log("==============================================");
    console.log("🎧🎧🎧 GENERATED MP3 AUDIO URL 🎧🎧🎧");
    console.log(savedMedia.url);
    console.log("==============================================");
  } catch (error) {
    logger.error(
      {
        error,
        filename,
        subdir,
        storageDriver: process.env.STORAGE_DRIVER,
      },
      "❌ FAILED TO SAVE MP3 AUDIO",
    );

    console.error("==============================================");
    console.error("❌ S3 / STORAGE UPLOAD FAILED");
    console.error(error);
    console.error("==============================================");

    throw error;
  }

  const url = savedMedia.url;

  // --------------------------------------------------
  // 6. Save URL in MongoDB
  // --------------------------------------------------

  try {
    await AudioAsset.create({
      lessonId: input.lessonId,
      moduleId: input.moduleId,
      voice: input.voice,
      style: input.style,
      contentHash,
      url,
    });

    logger.info(
      {
        lessonId: input.lessonId,
        moduleId: input.moduleId,
        url,
      },
      "✅ AudioAsset saved to MongoDB",
    );
  } catch (err) {
    const isDuplicateKey =
      (err as { code?: number }).code === 11000;

    if (!isDuplicateKey) {
      logger.error(
        {
          error: err,
          url,
        },
        "❌ Failed to save AudioAsset to MongoDB",
      );

      throw err;
    }

    logger.info(
      {
        url,
      },
      "ℹ️ AudioAsset already exists due to concurrent request",
    );
  }

  // --------------------------------------------------
  // 7. FINAL URL
  // --------------------------------------------------

  logger.info(
    {
      lessonId: input.lessonId,
      moduleId: input.moduleId,
      voice: input.voice,
      style: input.style,
      url,
      cached: false,
    },
    "🎉 NARRATION READY",
  );

  console.log("");
  console.log("================================================");
  console.log("🎉🎉🎉 FINAL MP3 AUDIO URL 🎉🎉🎉");
  console.log("================================================");
  console.log(url);
  console.log("================================================");
  console.log("");

  return {
    url,
    cached: false,
  };
}

export async function listNarrationForLesson(
  lessonId: string,
) {
  return AudioAsset.find({ lessonId })
    .sort({ moduleId: 1, createdAt: -1 })
    .limit(200);
}