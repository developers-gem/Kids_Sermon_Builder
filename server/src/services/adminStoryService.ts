import { storyRepository } from "../repositories/storyRepository.js";
import { AppError } from "../utils/AppError.js";
import type { CreateStoryInput, UpdateStoryInput, AdminStoryQueryInput } from "@ksb/validation";

export const adminStoryService = {
  async list(query: AdminStoryQueryInput) {
    const { items, total } = await storyRepository.findManyForAdmin(query);
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

  async getById(id: string) {
    const story = await storyRepository.findByIdForAdmin(id);
    if (!story) throw AppError.notFound("Story not found");
    return story;
  },

  async create(input: CreateStoryInput) {
    const existing = await storyRepository.findBySlugAnyStatus(input.slug);
    if (existing) {
      throw AppError.validation(`A story with slug "${input.slug}" already exists.`);
    }
    return storyRepository.create(input);
  },

  async update(id: string, patch: UpdateStoryInput) {
    if (patch.slug) {
      const existing = await storyRepository.findBySlugAnyStatus(patch.slug);
      if (existing && String(existing._id) !== id) {
        throw AppError.validation(`A story with slug "${patch.slug}" already exists.`);
      }
    }
    const story = await storyRepository.updateById(id, patch);
    if (!story) throw AppError.notFound("Story not found");
    return story;
  },

  async setStatus(id: string, status: "published" | "draft" | "archived") {
    const story = await storyRepository.updateById(id, { status });
    if (!story) throw AppError.notFound("Story not found");
    return story;
  },

  async remove(id: string) {
    const story = await storyRepository.deleteById(id);
    if (!story) throw AppError.notFound("Story not found");
    return story;
  },
};
