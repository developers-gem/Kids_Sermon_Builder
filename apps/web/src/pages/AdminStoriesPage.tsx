import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCircle2, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { adminStoriesApi } from "@/api/endpoints";

type Tab = "all" | "published" | "draft" | "archived";

export function AdminStoriesPage() {
  const [tab, setTab] = useState<Tab>("all");
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-stories", tab],
    queryFn: () => adminStoriesApi.list(tab === "all" ? {} : { status: tab }),
  });
  const stories = data?.stories ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-stories"] });

  const onSetStatus = async (id: string, status: "published" | "draft" | "archived") => {
    await adminStoriesApi.setStatus(id, status);
    invalidate();
  };

  const onDelete = async (id: string, title: string) => {
    if (!window.confirm(`Permanently delete "${title}"? This can't be undone.`)) return;
    await adminStoriesApi.remove(id);
    invalidate();
  };

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Manage built-in stories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Global content shown to every teacher — separate from lessons individual
            users create.
          </p>
        </div>
        <Link
          to="/admin/stories/new"
          className="ml-auto flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New story
        </Link>
      </div>

      <div className="mt-6 flex gap-2">
        {(
          [
            ["all", "All"],
            ["published", "Published"],
            ["draft", "Draft"],
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
          Couldn't load stories. Are you signed in as an admin?
        </p>
      )}

      {isLoading && (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="paper-card h-16 animate-pulse bg-secondary/50" />
          ))}
        </div>
      )}

      <ul className="mt-8 space-y-3">
        {stories.map((s) => (
          <li key={s.id} className="paper-card flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold">{s.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    s.status === "published"
                      ? "bg-leaf/20 text-leaf"
                      : s.status === "archived"
                        ? "bg-muted text-muted-foreground"
                        : "bg-accent/15 text-accent"
                  }`}
                >
                  {s.status}
                </span>
                {s.featured && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                    Featured
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {s.reference} · {s.slug}
              </p>
            </div>
            <Link
              to={`/admin/stories/${s.id}/edit`}
              className="rounded-full border-2 border-border p-2 text-muted-foreground hover:border-primary"
              aria-label={`Edit ${s.title}`}
            >
              <Pencil className="h-4 w-4" />
            </Link>
            {s.status !== "published" && (
              <button
                type="button"
                onClick={() => onSetStatus(s.id, "published")}
                className="rounded-full border-2 border-border p-2 text-muted-foreground hover:border-leaf"
                aria-label={`Publish ${s.title}`}
                title="Publish"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
            )}
            {s.status === "published" && (
              <button
                type="button"
                onClick={() => onSetStatus(s.id, "draft")}
                className="rounded-full border-2 border-border p-2 text-muted-foreground hover:border-accent"
                aria-label={`Unpublish ${s.title}`}
                title="Unpublish"
              >
                <EyeOff className="h-4 w-4" />
              </button>
            )}
            {s.status !== "archived" && (
              <button
                type="button"
                onClick={() => onSetStatus(s.id, "archived")}
                className="rounded-full border-2 border-border p-2 text-muted-foreground hover:border-primary"
                aria-label={`Archive ${s.title}`}
                title="Archive"
              >
                <Archive className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(s.id, s.title)}
              className="rounded-full border-2 border-destructive/40 p-2 text-destructive hover:bg-destructive/10"
              aria-label={`Delete ${s.title}`}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
