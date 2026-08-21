import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const shareLinkSchema = new Schema(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type ShareLinkDoc = InferSchemaType<typeof shareLinkSchema>;
export const ShareLink: Model<ShareLinkDoc> = model("ShareLink", shareLinkSchema);

const generationJobSchema = new Schema(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", default: null },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    type: {
      type: String,
      enum: ["lesson", "illustration", "coloring-page", "audio"],
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "generating", "validating", "generating-media", "ready", "failed"],
      default: "queued",
      index: true,
    },
    input: { type: Schema.Types.Mixed },
    error: { type: String, default: null },
  },
  { timestamps: true },
);

export type GenerationJobDoc = InferSchemaType<typeof generationJobSchema>;
export const GenerationJob: Model<GenerationJobDoc> = model("GenerationJob", generationJobSchema);

const lessonVersionSchema = new Schema(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", required: true, index: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    label: { type: String, default: "" },
  },
  { timestamps: true },
);

export type LessonVersionDoc = InferSchemaType<typeof lessonVersionSchema>;
export const LessonVersion: Model<LessonVersionDoc> = model("LessonVersion", lessonVersionSchema);
