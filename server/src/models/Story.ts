import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const activitySchema = new Schema(
  {
    title: { type: String, required: true },
    minutes: { type: Number, required: true },
    supplies: { type: String, required: true },
    steps: { type: [String], required: true },
  },
  { _id: false },
);

const storySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    reference: { type: String, required: true, index: true },
    theme: { type: String, required: true, index: true },
    ageRange: { type: String, required: true, index: true },
    image: { type: String, required: true },
    imageAlt: { type: String, required: true },
    bigIdea: { type: String, required: true },
    tellIt: { type: [String], required: true },
    askThem: { type: [String], required: true },
    memoryVerse: {
      text: { type: String, required: true },
      reference: { type: String, required: true },
      motions: { type: [String], required: true },
    },
    games: { type: [activitySchema], required: true },
    objectLesson: { type: activitySchema, required: true },
    coloringPage: {
      image: { type: String, required: true },
      alt: { type: String, required: true },
      caption: { type: String, required: true },
    },
    prayer: { type: String, required: true },
    status: { type: String, enum: ["published", "draft", "archived"], default: "published", index: true },
    featured: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

storySchema.index({ title: "text", theme: "text", bigIdea: "text" });

export type StoryDoc = InferSchemaType<typeof storySchema>;
export const Story: Model<StoryDoc> = model("Story", storySchema);
