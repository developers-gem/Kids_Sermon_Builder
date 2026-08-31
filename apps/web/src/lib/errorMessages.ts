import { ApiClientError } from "@/api/client";

/**
 * Prompt 23: "React should convert these [error codes] into friendly
 * messages." Every catch block across the app should call this instead of
 * reading `err.message` directly — that was previously just relaying
 * whatever text the server happened to send, which works when the server
 * message is already good but gives no consistent fallback for codes whose
 * server message might be terse, technical, or (for INTERNAL_ERROR/network
 * failures) actively unhelpful to show a teacher mid-lesson-prep.
 *
 * VALIDATION_ERROR is deliberately passed through as-is — it already
 * carries a specific, field-level message worth showing verbatim, unlike
 * the other codes where a generic-but-friendly fallback is better than the
 * raw text.
 */
const FRIENDLY_MESSAGES: Partial<Record<string, string>> = {
  AUTH_REQUIRED: "Please log in to do that.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "That couldn't be found. It may have been deleted or moved.",
  AI_GENERATION_FAILED: "",
  AUDIO_GENERATION_FAILED: "Narration couldn't be generated right now. Please try again.",
  IMAGE_GENERATION_FAILED: "The image couldn't be generated right now. Please try again.",
  PDF_GENERATION_FAILED: "The PDF couldn't be created right now. Please try again.",
  RATE_LIMITED: "You're doing that a bit too fast — please wait a moment and try again.",
  INTERNAL_ERROR: "Something went wrong on our end. Please try again.",
};

export function friendlyErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiClientError) {
    if (err.code === "VALIDATION_ERROR") return err.message;
    return FRIENDLY_MESSAGES[err.code] ?? err.message ?? fallback;
  }
  if (err instanceof TypeError && err.message === "Failed to fetch") {
    // The browser's own message for "no network / server unreachable" —
    // not from our API at all, so it isn't an ApiClientError.
    return "Couldn't reach the server. Please check your connection and try again.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
