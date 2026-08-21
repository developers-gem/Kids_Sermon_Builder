import { GenerationJob, type GenerationJobDoc } from "../models/Sharing.js";

export type GenerationJobStatus = GenerationJobDoc["status"];
export type GenerationJobType = GenerationJobDoc["type"];

export const generationJobRepository = {
  /** An in-flight job (not yet ready/failed) for this owner+type started recently — the duplicate-request signal. */
  /**
   * Only ever called for authenticated requests (see lessonService.createFromAi)
   * — this can't safely run for guests. There's no per-guest session
   * identifier in this app, only `ownerId: null` for every anonymous
   * caller, so querying on that would match any other unrelated guest's
   * in-flight job too, not just "this same person double-tapped." That
   * would incorrectly block a total stranger's unrelated request. Guests
   * simply don't get duplicate-request protection until there's a real
   * per-device/session identifier to key it on.
   */
  async findActiveForOwner(ownerId: string, type: GenerationJobType) {
    const cutoff = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes — long enough to cover a real in-flight generation, short enough that a stuck/crashed job doesn't block someone forever
    return GenerationJob.findOne({
      ownerId,
      type,
      status: { $in: ["queued", "generating", "validating", "generating-media"] },
      createdAt: { $gte: cutoff },
    });
  },

  async create(ownerId: string | null, type: GenerationJobType, input: unknown) {
    return GenerationJob.create({ ownerId, type, input, status: "generating" });
  },

  async setStatus(id: string, status: GenerationJobStatus) {
    return GenerationJob.findByIdAndUpdate(id, { status });
  },

  async complete(id: string, lessonId: string) {
    return GenerationJob.findByIdAndUpdate(id, { status: "ready", lessonId });
  },

  async fail(id: string, error: string) {
    return GenerationJob.findByIdAndUpdate(id, { status: "failed", error });
  },
};
