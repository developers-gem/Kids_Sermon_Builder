import mongoose from "mongoose";
import { storyRepository, type StoryQuery } from "../repositories/storyRepository.js";
import { AppError } from "../utils/AppError.js";

export const storyService = {
  async list(query: StoryQuery) {
    const { items, total } = await storyRepository.findMany(query);
    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  },

  /**
   * Stories are addressed by their stable slug ("noah", "david", ...) in
   * every client-facing URL — that slug survives re-seeding, unlike a Mongo
   * ObjectId. Fall back to an ObjectId lookup only for admin tooling that
   * already has the raw _id.
   */
  async getById(idOrSlug: string) {
    const story = mongoose.isValidObjectId(idOrSlug)
      ? await storyRepository.findById(idOrSlug)
      : await storyRepository.findBySlug(idOrSlug);
    if (!story) throw AppError.notFound("Story not found");
    return story;
  },

  async featured() {
    return storyRepository.findFeatured();
  },
};
