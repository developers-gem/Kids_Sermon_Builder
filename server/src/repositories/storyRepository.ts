import { Story, type StoryDoc } from "../models/Story.js";
import type { HydratedDocument } from "mongoose";
import type { CreateStoryInput, UpdateStoryInput } from "@ksb/validation";

export type StoryQuery = {
  search?: string;
  theme?: string;
  ageGroup?: string;
  featured?: boolean;
  page: number;
  limit: number;
};

export const storyRepository = {
  async findMany(query: StoryQuery): Promise<{ items: HydratedDocument<StoryDoc>[]; total: number }> {
    const filter: Record<string, unknown> = { status: "published" };
    if (query.theme) filter.theme = query.theme;
    if (query.ageGroup) filter.ageRange = query.ageGroup;
    if (query.featured !== undefined) filter.featured = query.featured;
    if (query.search) filter.$text = { $search: query.search };

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      Story.find(filter).sort({ createdAt: 1 }).skip(skip).limit(query.limit),
      Story.countDocuments(filter),
    ]);
    return { items, total };
  },

  async findById(id: string) {
    return Story.findById(id);
  },

  async findBySlug(slug: string) {
    return Story.findOne({ slug, status: "published" });
  },

  async findFeatured(limit = 6) {
    return Story.find({ status: "published", featured: true }).limit(limit);
  },

  // -- Admin (Prompt 21): sees every story regardless of status --

  async findManyForAdmin(opts: { status?: string; page: number; limit: number }) {
    const filter: Record<string, unknown> = {};
    if (opts.status) filter.status = opts.status;
    const skip = (opts.page - 1) * opts.limit;
    const [items, total] = await Promise.all([
      Story.find(filter).sort({ createdAt: -1 }).skip(skip).limit(opts.limit),
      Story.countDocuments(filter),
    ]);
    return { items, total };
  },

  /** Admin lookup by id regardless of status — an admin editing a draft still needs to find it. */
  async findByIdForAdmin(id: string) {
    return Story.findById(id);
  },

  async findBySlugAnyStatus(slug: string) {
    return Story.findOne({ slug });
  },

  async create(data: CreateStoryInput) {
    return Story.create(data);
  },

  async updateById(id: string, patch: UpdateStoryInput) {
    return Story.findByIdAndUpdate(id, patch, { new: true });
  },

  async deleteById(id: string) {
    return Story.findByIdAndDelete(id);
  },
};
