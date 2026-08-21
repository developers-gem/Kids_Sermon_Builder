import type { HydratedDocument } from "mongoose";
import type { LessonDoc } from "../models/Lesson.js";

/**
 * A lesson viewed by anyone other than its owner (a public lesson reached
 * directly, or one reached via a share token) should never carry the
 * owner's personal organization state (isFavorite, isArchived) or their
 * identity (ownerId) — those are private to the owner's own account, not
 * properties of the lesson content itself. Everything else about the
 * lesson is fair to show, since that's the whole point of sharing it.
 */
export function toPublicLessonView(lesson: HydratedDocument<LessonDoc>) {
  const obj = lesson.toObject();
  const { ownerId: _ownerId, isFavorite: _isFavorite, isArchived: _isArchived, ...rest } = obj as Record<
    string,
    unknown
  >;
  return rest;
}
