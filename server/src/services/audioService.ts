import { createHash } from "node:crypto";
import { AudioAsset } from "../models/AudioAsset.js";
import { requestNarrationAudio } from "../integrations/tts/gateway.js";
import { saveMedia } from "../integrations/storage/index.js";
import type { NarrationStyleId } from "@ksb/types";

function hashText(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 24);
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
 * The cache-and-store flow Prompt 12 asks for, replacing "generate fresh
 * audio on every call": look up an existing clip keyed on
 * (lessonId, moduleId, contentHash, voice, style) — contentHash stands in
 * for "contentVersion," so an edited section naturally gets new audio next
 * time it's requested, without needing an explicit version counter. If the
 * content, voice, and style all match something already generated, that
 * clip is reused; nothing is regenerated unnecessarily.
 */
export async function getOrCreateNarration(input: GetOrCreateNarrationInput): Promise<NarrationResult> {
  const contentHash = hashText(input.text);

  const existing = await AudioAsset.findOne({
    lessonId: input.lessonId,
    moduleId: input.moduleId,
    contentHash,
    voice: input.voice,
    style: input.style,
  });
  if (existing) {
    return { url: existing.url, cached: true };
  }

  const upstream = await requestNarrationAudio({ text: input.text, voice: input.voice, style: input.style });
  const buffer = Buffer.from(await upstream.arrayBuffer());

  const filename = `${safePathSegment(input.moduleId)}-${contentHash}-${safePathSegment(input.voice)}-${safePathSegment(input.style)}.mp3`;
  const { url } = await saveMedia(buffer, `audio/${safePathSegment(input.lessonId)}`, filename);

  // Two concurrent requests for the exact same clip can race past the
  // findOne above; the unique index on AudioAsset absorbs that safely.
  try {
    await AudioAsset.create({
      lessonId: input.lessonId,
      moduleId: input.moduleId,
      voice: input.voice,
      style: input.style,
      contentHash,
      url,
    });
  } catch (err) {
    const isDuplicateKey = (err as { code?: number }).code === 11000;
    if (!isDuplicateKey) throw err;
  }

  return { url, cached: false };
}

export async function listNarrationForLesson(lessonId: string) {
  // Naturally bounded by (module × voice × style) combinations — small in
  // practice — but capped anyway rather than left unbounded, same
  // reasoning as lessonVersionRepository.
  return AudioAsset.find({ lessonId }).sort({ moduleId: 1, createdAt: -1 }).limit(200);
}
