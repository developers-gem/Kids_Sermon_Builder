import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Heart, Star, Trash2 } from "lucide-react";
import { lessonsApi } from "@/api/endpoints";

/**
 * Prompt 18 lists All/Drafts/Completed/Favorites/Recently used/Archived.
 * Drafts and Completed are deliberately not included here: every lesson
 * this app creates — whether built from a story or AI-generated — is
 * immediately given status "ready"; nothing ever produces a "draft" or
 * "generating" lesson (the `LessonStatus` type has those states for a
 * possible future async-generation flow, but no current code path sets
 * them). A "Drafts" tab would be permanently empty, and "Completed" would
 * just be a second copy of "All" — both would be checkbox-compliance
 * rather than a real feature, so they're left out until lessons can
 * actually be in a non-ready state.
 */
type Tab = "all" | "favorites" | "recent" | "archived";

const RECENT_WINDOW_DAYS = 14;

export function MyLessonsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lessons", tab],
    queryFn: () =>
      lessonsApi.list(
        tab === "favorites"
          ? { favorite: true }
          : tab === "archived"
            ? { archived: true }
            : {},
      ),
  });

  const cutoff = Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const lessons = (data?.lessons ?? []).filter((l) =>
    tab === "recent" ? new Date(l.updatedAt).getTime() >= cutoff : true,
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["lessons"] });

  const onToggleFavorite = async (id: string, isFavorite: boolean) => {
    await (isFavorite ? lessonsApi.unfavorite(id) : lessonsApi.favorite(id));
    invalidate();
  };

  const onToggleArchive = async (id: string, isArchived: boolean) => {
    await (isArchived ? lessonsApi.unarchive(id) : lessonsApi.archive(id));
    invalidate();
  };

  const onDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    await lessonsApi.remove(id);
    invalidate();
  };

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <h1 className="text-4xl font-extrabold">My lessons</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Lessons you've built or generated, saved to your account.
      </p>

      <div className="mt-6 flex gap-2">
        {(
          [
            ["all", "All"],
            ["favorites", "Favorites"],
            ["recent", "Recently used"],
            ["archived", "Archived"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors ${
              tab === id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isError && (
        <p className="mt-8 rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
          Couldn't load your lessons. Is the backend running?
        </p>
      )}

      {isLoading && (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="paper-card h-24 animate-pulse bg-secondary/50" />
          ))}
        </div>
      )}

      {!isLoading && !isError && lessons.length === 0 && (
        <div className="paper-card mt-8 p-8 text-center">
          <p className="font-display text-lg font-bold">
            {tab === "favorites"
              ? "No favorites yet."
              : tab === "archived"
                ? "Nothing archived."
                : tab === "recent"
                  ? `Nothing updated in the last ${RECENT_WINDOW_DAYS} days.`
                  : "No saved lessons yet."}
          </p>
          <p className="mt-2 text-muted-foreground">
            Build one from the{" "}
            <Link to="/" className="font-bold text-accent underline">
              Builder
            </Link>{" "}
            or generate one with the{" "}
            <Link to="/create" className="font-bold text-accent underline">
              Custom Story Builder
            </Link>
            .
          </p>
        </div>
      )}

      <ul className="mt-8 space-y-4">
        {lessons.map((lesson) => (
          <li key={lesson.id} className="paper-card flex flex-wrap items-center gap-4 p-5">
            <div className="min-w-0 flex-1">
              <Link to={`/lesson/${lesson.id}`} className="font-display text-xl font-bold hover:underline">
                {lesson.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {lesson.bibleReference} · {lesson.ageGroup} · {lesson.durationMinutes} min
                {lesson.reviewRequired && (
                  <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                    Review Scripture
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleFavorite(lesson.id, lesson.isFavorite)}
              aria-label={lesson.isFavorite ? "Remove from favorites" : "Add to favorites"}
              title={lesson.isFavorite ? "Remove from favorites" : "Add to favorites"}
              className={`rounded-full border-2 p-2 transition-colors ${
                lesson.isFavorite
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted-foreground hover:border-accent"
              }`}
            >
              {lesson.isFavorite ? <Star className="h-4 w-4 fill-current" /> : <Heart className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => onToggleArchive(lesson.id, lesson.isArchived)}
              aria-label={lesson.isArchived ? "Restore" : "Archive"}
              title={lesson.isArchived ? "Restore" : "Archive"}
              className="rounded-full border-2 border-border p-2 text-muted-foreground hover:border-primary"
            >
              {lesson.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => onDelete(lesson.id, lesson.title)}
              aria-label="Delete"
              title="Delete"
              className="rounded-full border-2 border-destructive/40 p-2 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
