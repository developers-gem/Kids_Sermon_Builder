import { LessonVersion, type LessonVersionDoc } from "../models/Sharing.js";

export const lessonVersionRepository = {
  async create(lessonId: string, snapshot: Record<string, unknown>, label: string) {
    return LessonVersion.create({ lessonId, snapshot, label });
  },

  async findManyForLesson(lessonId: string) {
    // Every regenerate/restore/manual-save action creates a version, so
    // this can genuinely grow over a lesson's lifetime — capped rather
    // than left unbounded (Prompt 24: no unbounded queries). Newest 50 is
    // plenty for a "restore an earlier version" UI; nobody is scrolling
    // past that in practice.
    return LessonVersion.find({ lessonId }).sort({ createdAt: -1 }).limit(50);
  },

  async findByIdForLesson(id: string, lessonId: string) {
    return LessonVersion.findOne({ _id: id, lessonId });
  },

  async deleteManyForLesson(lessonId: string) {
    return LessonVersion.deleteMany({ lessonId });
  },
};

export type { LessonVersionDoc };
