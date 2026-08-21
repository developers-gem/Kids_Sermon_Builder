import { Schema, model, type InferSchemaType, type Model } from "mongoose";
import { LESSON_MODULE_IDS } from "@ksb/types";

const activitySchema = new Schema(
  {
    title: { type: String, required: true },
    minutes: { type: Number, required: true },
    supplies: { type: String, required: true },
    steps: { type: [String], required: true },
  },
  { _id: false },
);

const lessonSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    source: { type: String, enum: ["story", "custom"], required: true },
    storyId: { type: Schema.Types.ObjectId, ref: "Story", default: null },

    title: { type: String, required: true, index: true },
    bibleReference: { type: String, required: true, index: true },
    ageGroup: { type: String, required: true, index: true },
    theme: { type: String, default: "", index: true },
    bigIdea: { type: String, required: true },

    story: { type: [String], required: true },
    askThem: { type: [String], required: true },
    memoryVerse: {
      text: { type: String, required: true },
      reference: { type: String, required: true },
      motions: { type: [String], required: true },
    },
    games: { type: [activitySchema], default: [] },
    objectLesson: { type: activitySchema, required: true },
    coloringPage: {
      type: new Schema(
        { image: String, alt: String, caption: String },
        { _id: false },
      ),
      default: null,
    },
    prayer: { type: String, required: true },

    illustration: {
      type: new Schema({ url: String, prompt: String }, { _id: false }),
      default: null,
    },
    illustrationStyle: { type: String, default: null },

    activeModules: { type: [String], enum: LESSON_MODULE_IDS, default: [...LESSON_MODULE_IDS] },
    durationMinutes: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["draft", "generating", "ready", "failed", "archived"],
      default: "draft",
      index: true,
    },
    visibility: { type: String, enum: ["private", "shared", "public"], default: "private" },

    contentStatus: { type: String, enum: ["ok", "review_required"], default: "ok" },
    reviewRequired: { type: Boolean, default: false },
    validationWarnings: { type: [String], default: [] },

    isFavorite: { type: Boolean, default: false, index: true },
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

lessonSchema.index({ ownerId: 1, createdAt: -1 });
lessonSchema.index({ title: "text", bibleReference: "text" });

export type LessonDoc = InferSchemaType<typeof lessonSchema>;
export const Lesson: Model<LessonDoc> = model("Lesson", lessonSchema);
