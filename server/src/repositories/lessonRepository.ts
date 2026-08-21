import { Lesson, type LessonDoc } from "../models/Lesson.js";
import type { FilterQuery } from "mongoose";

/**
 * Same shape as LessonDoc but with ObjectId-typed fields relaxed to `string`.
 * Mongoose casts string ids to ObjectId at runtime; InferSchemaType is just
 * stricter than we need for these two call sites (ownerId comes straight off
 * a JWT payload, storyId off a Mongoose _id that's already been stringified).
 */
type CreateLessonData = Omit<
  Partial<LessonDoc>,
  "ownerId" | "storyId" | "games" | "objectLesson" | "coloringPage"
> & {
  ownerId?: string | null;
  storyId?: string | null;
  games?: { title: string; minutes: number; supplies: string; steps: string[] }[];
  objectLesson?: { title: string; minutes: number; supplies: string; steps: string[] };
  coloringPage?: { image: string; alt: string; caption: string } | null;
};

export const lessonRepository = {
  async create(data: CreateLessonData) {
    return Lesson.create(data as Partial<LessonDoc>);
  },

  async findById(id: string) {
    return Lesson.findById(id);
  },

  /** SECURITY: same non-skippable ownerId filter as updateById/deleteById — see note there. */
  async findByIdForOwner(id: string, ownerId: string | null) {
    return Lesson.findOne({ _id: id, ownerId });
  },

  async findManyForOwner(
    ownerId: string,
    opts: { status?: string; favorite?: boolean; archived?: boolean; page: number; limit: number },
  ) {
    const filter: FilterQuery<LessonDoc> = { ownerId, isArchived: opts.archived === true };
    if (opts.status) filter.status = opts.status;
    if (opts.favorite) filter.isFavorite = true;

    const skip = (opts.page - 1) * opts.limit;
    const [items, total] = await Promise.all([
      Lesson.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(opts.limit),
      Lesson.countDocuments(filter),
    ]);
    return { items, total };
  },

  /**
   * SECURITY: `ownerId` is always applied to the filter, including when it's
   * `null` (a guest requester) — never skipped. Skipping it for falsy values
   * was a real bug: it let an anonymous request mutate or delete *any*
   * lesson by id, not just guest-owned ones. With this filter, a guest can
   * only touch lessons that are themselves unowned (`ownerId: null`), and an
   * authenticated user can only touch their own.
   */
  async updateById(id: string, ownerId: string | null, patch: Partial<CreateLessonData>) {
    const filter: FilterQuery<LessonDoc> = { _id: id, ownerId };
    return Lesson.findOneAndUpdate(filter, patch as Partial<LessonDoc>, { new: true });
  },

  async deleteById(id: string, ownerId: string | null) {
    const filter: FilterQuery<LessonDoc> = { _id: id, ownerId };
    return Lesson.findOneAndDelete(filter);
  },
};
