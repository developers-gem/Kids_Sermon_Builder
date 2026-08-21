/**
 * Domain types shared by the Express backend, the React web app, and used as
 * the reference contract for the Flutter mobile app.
 *
 * IMPORTANT: This is the single source of truth for lesson/story shape.
 * Do not redefine these types separately in apps/web or server — import them.
 */

export type Activity = {
  title: string;
  minutes: number;
  supplies: string;
  steps: string[];
};

export type MemoryVerse = {
  text: string;
  reference: string;
  motions: string[];
};

export type ColoringPageRef = {
  /** URL to the image (object storage in production, bundled asset for seed data) */
  image: string;
  alt: string;
  caption: string;
};

/** A built-in, admin-managed Bible story (global content). */
export type Story = {
  id: string;
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
  memoryVerse: MemoryVerse;
  games: Activity[];
  objectLesson: Activity;
  coloringPage: ColoringPageRef;
  prayer: string;
  status: "published" | "draft" | "archived";
  featured: boolean;
};

export const LESSON_MODULE_IDS = [
  "story",
  "verse",
  "games",
  "object",
  "coloring",
  "prayer",
] as const;

export type LessonModuleId = (typeof LESSON_MODULE_IDS)[number];

export type LessonStatus = "draft" | "generating" | "ready" | "failed" | "archived";
export type LessonVisibility = "private" | "shared" | "public";
export type LessonSource = "story" | "custom";

/** A user-owned lesson: either built from a Story (Workflow A) or AI-generated (Workflow B). */
export type Lesson = {
  id: string;
  ownerId: string | null; // null while guest/local-only
  source: LessonSource;
  storyId: string | null; // set when source === "story"

  title: string;
  bibleReference: string;
  ageGroup: string;
  theme: string;
  bigIdea: string;

  story: string[]; // "tell it" narrative paragraphs
  askThem: string[];
  memoryVerse: MemoryVerse;
  games: Activity[];
  objectLesson: Activity;
  coloringPage: ColoringPageRef | null;
  prayer: string;

  illustration: { url: string; prompt: string } | null;
  illustrationStyle: string | null;

  activeModules: LessonModuleId[];
  durationMinutes: number;

  status: LessonStatus;
  visibility: LessonVisibility;
  contentStatus: "ok" | "review_required";
  reviewRequired: boolean;
  validationWarnings: string[];

  isFavorite: boolean;
  isArchived: boolean;

  createdAt: string;
  updatedAt: string;
};

export type NarrationVoiceId = "alloy" | "shimmer" | "nova" | "fable" | "echo" | "onyx";
export type NarrationStyleId = "kid-friendly" | "storyteller" | "teacher";

export type NarrationSettings = {
  voice: NarrationVoiceId;
  style: NarrationStyleId;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
};

/** Generic API envelopes used by every Express endpoint. */
export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
