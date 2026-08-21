import { api, fetchBinary } from "./client";
import type { Story, Lesson, AuthUser as _AuthUser } from "@ksb/types";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const storiesApi = {
  list: (params: { search?: string; theme?: string; ageGroup?: string } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return api.get<{ stories: Story[]; pagination: Pagination }>(`/stories${qs ? `?${qs}` : ""}`);
  },
  featured: () => api.get<{ stories: Story[] }>("/stories/featured"),
  getById: (id: string) => api.get<{ story: Story }>(`/stories/${id}`),
};

export const lessonsApi = {
  createFromStory: (input: { storyId: string; activeModules: string[] }) =>
    api.post<{ lesson: Lesson }>("/lessons", input),
  list: (params: { status?: string; favorite?: boolean; archived?: boolean } = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return api.get<{ lessons: Lesson[]; pagination: Pagination }>(`/lessons${qs ? `?${qs}` : ""}`);
  },
  getById: (id: string) => api.get<{ lesson: Lesson }>(`/lessons/${id}`),
  updateModules: (id: string, activeModules: string[]) =>
    api.put<{ lesson: Lesson }>(`/lessons/${id}/modules`, { activeModules }),
  reorderModules: (id: string, order: string[]) =>
    api.post<{ lesson: Lesson }>(`/lessons/${id}/modules/reorder`, { order }),
  updateContent: (id: string, patch: Partial<LessonContentEdit>) =>
    api.put<{ lesson: Lesson }>(`/lessons/${id}`, patch),
  duplicate: (id: string) => api.post<{ lesson: Lesson }>(`/lessons/${id}/duplicate`),
  favorite: (id: string) => api.post<{ lesson: Lesson }>(`/lessons/${id}/favorite`),
  unfavorite: (id: string) => api.delete<{ lesson: Lesson }>(`/lessons/${id}/favorite`),
  archive: (id: string) => api.post<{ lesson: Lesson }>(`/lessons/${id}/archive`),
  unarchive: (id: string) => api.delete<{ lesson: Lesson }>(`/lessons/${id}/archive`),
  remove: (id: string) => api.delete<Record<string, never>>(`/lessons/${id}`),
};

export interface LessonContentEdit {
  title: string;
  bigIdea: string;
  story: string[];
  askThem: string[];
  memoryVerse: { text: string; reference: string; motions: string[] };
  games: { title: string; minutes: number; supplies: string; steps: string[] }[];
  objectLesson: { title: string; minutes: number; supplies: string; steps: string[] };
  coloringPage: { caption: string };
  prayer: string;
}

export interface LessonVersion {
  id: string;
  label: string;
  createdAt: string;
}

export const lessonVersionsApi = {
  save: (lessonId: string, label = "") =>
    api.post<{ version: LessonVersion }>(`/lessons/${lessonId}/versions`, { label }),
  list: (lessonId: string) => api.get<{ versions: LessonVersion[] }>(`/lessons/${lessonId}/versions`),
  restore: (lessonId: string, versionId: string) =>
    api.post<{ lesson: Lesson }>(`/lessons/${lessonId}/versions/${versionId}/restore`),
};

export const sharingApi = {
  create: (lessonId: string) => api.post<{ token: string }>(`/lessons/${lessonId}/share`),
  revoke: (lessonId: string) => api.delete<Record<string, never>>(`/lessons/${lessonId}/share`),
  getByToken: (token: string) => api.get<{ lesson: Lesson }>(`/shared/${token}`),
  duplicateFromToken: (token: string) => api.post<{ lesson: Lesson }>(`/shared/${token}/duplicate`),
};

export const lessonRegenerateApi = {
  regenerateModule: (lessonId: string, moduleId: string, instruction = "") =>
    api.post<{ lesson: Lesson }>(`/lessons/${lessonId}/modules/${moduleId}/regenerate`, { instruction }),
};

export const coloringPageApi = {
  generate: (lessonId: string, instruction = "") =>
    api.post<{ lesson: Lesson }>(`/lessons/${lessonId}/coloring-page/generate`, { instruction }),
};

export const lessonPdfApi = {
  download: (lessonId: string, size: "letter" | "a4" = "letter") =>
    fetchBinary(`/lessons/${lessonId}/pdf?size=${size}`),
  downloadColoringPage: (lessonId: string, size: "letter" | "a4" = "letter") =>
    fetchBinary(`/lessons/${lessonId}/coloring-page/pdf?size=${size}`),
};

export const aiApi = {
  generateLesson: (input: {
    passage: string;
    ageGroup: string;
    style: string;
    styleDescription: string;
    focus: string;
    withIllustration: boolean;
  }) => api.post<{ lesson: Lesson }>("/ai/generate-lesson", input),
};

export interface NarrationAsset {
  id: string;
  moduleId: string;
  voice: string;
  style: string;
  url: string;
  createdAt: string;
}

/**
 * The endpoint now returns a JSON envelope with a cached (or freshly cached)
 * audio URL — the client fetches the actual mp3 bytes from that URL
 * separately, rather than the endpoint streaming audio directly. This is
 * what makes caching possible: the same (lesson, module, text, voice,
 * style) combination reuses the same URL instead of regenerating.
 */
export const audioApi = {
  generate: async (
    lessonId: string,
    moduleId: string,
    input: { text: string; voice: string; style: "kid-friendly" | "storyteller" | "teacher" },
  ): Promise<{ url: string; cached: boolean }> =>
    api.post(`/lessons/${lessonId}/audio/${moduleId}/generate`, input),
  list: (lessonId: string) => api.get<{ assets: NarrationAsset[] }>(`/lessons/${lessonId}/audio`),
};

export const authApi = {
  register: (input: { name: string; email: string; password: string }) =>
    api.post<{ user: _AuthUser; accessToken: string }>("/auth/register", input),
  login: (input: { email: string; password: string }) =>
    api.post<{ user: _AuthUser; accessToken: string }>("/auth/login", input),
  logout: () => api.post<Record<string, never>>("/auth/logout"),
  me: () => api.get<{ user: _AuthUser }>("/auth/me"),
};

// ---------------------------------------------------------------------------
// Admin content management (Prompt 21) — every call here is requireAdmin on
// the backend regardless of whether the button is ever shown in the UI.
// ---------------------------------------------------------------------------

export type AdminStoryInput = {
  slug: string;
  title: string;
  reference: string;
  theme: string;
  ageRange: string;
  image: string;
  imageAlt: string;
  bigIdea: string;
  tellIt: string[];
  askThem: string[];
  memoryVerse: { text: string; reference: string; motions: string[] };
  games: { title: string; minutes: number; supplies: string; steps: string[] }[];
  objectLesson: { title: string; minutes: number; supplies: string; steps: string[] };
  coloringPage: { image: string; alt: string; caption: string };
  prayer: string;
  status: "published" | "draft" | "archived";
  featured: boolean;
};

export const adminStoriesApi = {
  list: (params: { status?: string } = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)),
    ).toString();
    return api.get<{ stories: Story[]; pagination: Pagination }>(
      `/admin/stories${qs ? `?${qs}` : ""}`,
    );
  },
  getById: (id: string) => api.get<{ story: Story }>(`/admin/stories/${id}`),
  create: (input: AdminStoryInput) => api.post<{ story: Story }>("/admin/stories", input),
  update: (id: string, input: Partial<AdminStoryInput>) =>
    api.put<{ story: Story }>(`/admin/stories/${id}`, input),
  setStatus: (id: string, status: "published" | "draft" | "archived") =>
    api.patch<{ story: Story }>(`/admin/stories/${id}/status`, { status }),
  remove: (id: string) => api.delete<Record<string, never>>(`/admin/stories/${id}`),
};
