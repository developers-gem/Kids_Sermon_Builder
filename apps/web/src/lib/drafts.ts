import { useCallback, useEffect, useState } from "react";
import type { Lesson } from "@ksb/types";

export type DraftForm = {
  passage: string;
  ageGroup: string;
  style: string;
  focus: string;
  withIllustration: boolean;
};

export type Draft = {
  id: string; // the Lesson's server-side _id
  title: string;
  savedAt: number;
  form: DraftForm;
  lesson: Lesson;
};

const KEY = "sermon-drafts-v2";

function read(): Draft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Draft[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(drafts: Draft[]) {
  window.localStorage.setItem(KEY, JSON.stringify(drafts));
}

/**
 * This is a device-local *shortcut list* back to lessons that are already
 * persisted in MongoDB by POST /api/ai/generate-lesson (every generation is
 * saved server-side regardless of login, per Non-Negotiable Rule 11 — no
 * lesson content lives only in localStorage). Once My Lessons ships
 * (Phase 2 / Prompt 18) with real auth-backed listing, this becomes a thin
 * "recently generated on this device" convenience and can be removed.
 */
export function useDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDrafts(read());
    setReady(true);
  }, []);

  const persist = useCallback((next: Draft[]) => {
    const sorted = [...next].sort((a, b) => b.savedAt - a.savedAt);
    setDrafts(sorted);
    try {
      write(sorted);
      return null;
    } catch {
      return "This device has no room left to save more drafts. Delete a few and try again.";
    }
  }, []);

  const saveDraft = useCallback(
    (draft: Omit<Draft, "savedAt">) => {
      const current = read();
      const next = current.filter((d) => d.id !== draft.id);
      next.push({ ...draft, savedAt: Date.now() });
      return persist(next);
    },
    [persist],
  );

  const renameDraft = useCallback(
    (id: string, title: string) =>
      persist(read().map((d) => (d.id === id ? { ...d, title, savedAt: Date.now() } : d))),
    [persist],
  );

  const deleteDraft = useCallback(
    (id: string) => persist(read().filter((d) => d.id !== id)),
    [persist],
  );

  return { drafts, ready, saveDraft, renameDraft, deleteDraft };
}
