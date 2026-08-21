import { randomBytes } from "node:crypto";
import { ShareLink } from "../models/Sharing.js";
import { lessonRepository } from "../repositories/lessonRepository.js";
import { AppError } from "../utils/AppError.js";

function generateToken(): string {
  // 24 random bytes -> 32-char base64url token. Long and random enough that
  // guessing a live share link isn't a realistic attack, without needing a
  // dedicated secret — the token itself is the credential.
  return randomBytes(24).toString("base64url");
}

export const sharingService = {
  /**
   * Creates (or reuses) an active share link for a lesson the caller owns.
   * Also flips the lesson's visibility to "shared" so the same read-access
   * rule already used everywhere else (lessonService.getById: owner-or-public)
   * doesn't need a special case for "has an active share link" — the token
   * route below is the only way to reach a "shared" lesson anonymously.
   */
  async createShareLink(lessonId: string, ownerId: string) {
    const lesson = await lessonRepository.findByIdForOwner(lessonId, ownerId);
    if (!lesson) throw AppError.notFound("Lesson not found");

    const existing = await ShareLink.findOne({ lessonId, revoked: false });
    if (existing) {
      return existing;
    }

    const link = await ShareLink.create({
      lessonId,
      token: generateToken(),
      createdBy: ownerId,
      revoked: false,
    });

    if (lesson.visibility === "private") {
      await lessonRepository.updateById(lessonId, ownerId, { visibility: "shared" });
    }

    return link;
  },

  /** Revokes the active share link, if any, and reverts visibility to private. */
  async revokeShareLink(lessonId: string, ownerId: string) {
    const lesson = await lessonRepository.findByIdForOwner(lessonId, ownerId);
    if (!lesson) throw AppError.notFound("Lesson not found");

    await ShareLink.updateMany({ lessonId, revoked: false }, { revoked: true });
    if (lesson.visibility === "shared") {
      await lessonRepository.updateById(lessonId, ownerId, { visibility: "private" });
    }
  },

  /**
   * Resolves a share token to its lesson. A shared lesson is strictly
   * read-only through this path — there is no update/delete route that
   * accepts a token, only an id + ownership check, so this function being
   * the only token-based lookup is itself the enforcement.
   */
  async getByToken(token: string) {
    const link = await ShareLink.findOne({ token, revoked: false });
    if (!link) throw AppError.notFound("This share link is invalid or has been revoked.");

    const lesson = await lessonRepository.findById(String(link.lessonId));
    if (!lesson) throw AppError.notFound("This share link is invalid or has been revoked.");

    return lesson;
  },

  /** "Duplicate to My Lessons" from a shared link — the new copy belongs to the duplicating user, not the original owner. */
  async duplicateFromToken(token: string, newOwnerId: string) {
    const original = await sharingService.getByToken(token);

    return lessonRepository.create({
      ownerId: newOwnerId,
      source: original.source,
      storyId: original.storyId ? String(original.storyId) : null,
      title: `${original.title} (copy)`,
      bibleReference: original.bibleReference,
      ageGroup: original.ageGroup,
      theme: original.theme,
      bigIdea: original.bigIdea,
      story: original.story,
      askThem: original.askThem,
      memoryVerse: original.memoryVerse,
      games: original.games,
      objectLesson: original.objectLesson,
      coloringPage: original.coloringPage
        ? {
            image: original.coloringPage.image ?? "",
            alt: original.coloringPage.alt ?? "",
            caption: original.coloringPage.caption ?? "",
          }
        : null,
      prayer: original.prayer,
      illustration: original.illustration ?? null,
      illustrationStyle: original.illustrationStyle ?? null,
      activeModules: original.activeModules,
      durationMinutes: original.durationMinutes,
      status: "ready",
      contentStatus: original.contentStatus,
      reviewRequired: original.reviewRequired,
      validationWarnings: original.validationWarnings,
      isFavorite: false,
      isArchived: false,
    });
  },
};
