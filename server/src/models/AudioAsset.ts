import { Schema, model, type InferSchemaType, type Model } from "mongoose";

/**
 * One cached narration clip. The compound index is the actual cache key
 * (Prompt 12): a lookup on all five fields is how the audio controller
 * decides "do we already have this exact narration, or do we need to
 * generate it." `contentHash` (sha256 of the narrated text) stands in for
 * "contentVersion" — if the underlying lesson text changes, the hash
 * changes, and the old cached clip is simply never matched again rather
 * than needing an explicit version counter to track.
 */
const audioAssetSchema = new Schema(
  {
    /**
     * A cache-key namespace, not a strict foreign key: it holds a real
     * Lesson's ObjectId (as a string) once a lesson is saved, but also
     * needs to work for the Builder's story preview — before the teacher
     * clicks "Save to My Lessons," there's no Lesson document yet, only a
     * built-in Story being previewed. That case uses "story:<slug>" as the
     * lessonId instead, which still lets narration for the six built-in
     * stories cache correctly (their text never changes) without forcing
     * every preview listen to create a throwaway Lesson row first.
     */
    lessonId: { type: String, required: true, index: true },
    moduleId: { type: String, required: true },
    voice: { type: String, required: true },
    style: { type: String, required: true },
    contentHash: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, default: "audio/mpeg" },
  },
  { timestamps: true },
);

audioAssetSchema.index(
  { lessonId: 1, moduleId: 1, contentHash: 1, voice: 1, style: 1 },
  { unique: true },
);

export type AudioAssetDoc = InferSchemaType<typeof audioAssetSchema>;
export const AudioAsset: Model<AudioAssetDoc> = model("AudioAsset", audioAssetSchema);
