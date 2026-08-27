import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { adminStoriesApi, type AdminStoryInput } from "@/api/endpoints";
import { friendlyErrorMessage } from "@/lib/errorMessages";

const EMPTY: AdminStoryInput = {
  slug: "",
  title: "",
  reference: "",
  theme: "",
  ageRange: "",
  image: "",
  imageAlt: "",
  bigIdea: "",
  tellIt: [""],
  askThem: [""],
  memoryVerse: { text: "", reference: "", motions: [""] },
  games: [{ title: "", minutes: 5, supplies: "", steps: [""] }],
  objectLesson: { title: "", minutes: 5, supplies: "", steps: [""] },
  coloringPage: { image: "", alt: "", caption: "" },
  prayer: "",
  status: "draft",
  featured: false,
};

export function AdminStoryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "undefined" || id === "new";
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-story", id],
    queryFn: () => adminStoriesApi.getById(id!),
    enabled: !isNew && Boolean(id) && id !== "undefined",
  });

  const [form, setForm] = useState<AdminStoryInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.story) {
      const s = data.story;
      setForm({
        slug: s.slug ?? "",
        title: s.title ?? "",
        reference: s.reference ?? "",
        theme: s.theme ?? "",
        ageRange: s.ageRange ?? "",
        image: s.image ?? "",
        imageAlt: s.imageAlt ?? "",
        bigIdea: s.bigIdea ?? "",
        tellIt: s.tellIt ?? [""],
        askThem: s.askThem ?? [""],
        memoryVerse: s.memoryVerse ?? { text: "", reference: "", motions: [""] },
        games: s.games?.length ? s.games : [{ title: "", minutes: 5, supplies: "", steps: [""] }],
        objectLesson: s.objectLesson ?? { title: "", minutes: 5, supplies: "", steps: [""] },
        coloringPage: s.coloringPage ?? { image: "", alt: "", caption: "" },
        prayer: s.prayer ?? "",
        status: s.status ?? "draft",
        featured: Boolean(s.featured),
      });
    }
  }, [data]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const res = await adminStoriesApi.create(form);
        const storyId = (res.story as any)?.id ?? (res.story as any)?._id;
        navigate(`/admin/stories/${storyId}/edit`, { replace: true });
      } else {
        await adminStoriesApi.update(id!, form);
      }
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const input = "mt-1 w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
  const label = "text-xs font-bold uppercase tracking-wide text-muted-foreground";

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
      <Link to="/admin/stories" className="text-sm font-bold text-accent underline">
        Back to stories
      </Link>
      <h1 className="mt-2 text-3xl font-extrabold">{isNew ? "New story" : `Edit: ${form.title}`}</h1>

      <form onSubmit={onSubmit} className="paper-card mt-6 space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Slug (URL-safe id)</span>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="noah"
              required
              className={input}
            />
          </label>
          <label className="block">
            <span className={label}>Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as AdminStoryInput["status"] })}
              className={input}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className={label}>Title</span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className={input}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className={label}>Bible reference</span>
            <input
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="Genesis 6-9"
              required
              className={input}
            />
          </label>
          <label className="block">
            <span className={label}>Theme</span>
            <input
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value })}
              required
              className={input}
            />
          </label>
          <label className="block">
            <span className={label}>Age range</span>
            <input
              value={form.ageRange}
              onChange={(e) => setForm({ ...form, ageRange: e.target.value })}
              placeholder="Ages 3-8"
              required
              className={input}
            />
          </label>
        </div>

        <label className="block">
          <span className={label}>Big idea</span>
          <input
            value={form.bigIdea}
            onChange={(e) => setForm({ ...form, bigIdea: e.target.value })}
            required
            className={input}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Illustration image URL</span>
            <input
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              required
              className={input}
            />
          </label>
          <label className="block">
            <span className={label}>Illustration alt text</span>
            <input
              value={form.imageAlt}
              onChange={(e) => setForm({ ...form, imageAlt: e.target.value })}
              required
              className={input}
            />
          </label>
        </div>

        <label className="block">
          <span className={label}>Tell it (one paragraph per line)</span>
          <textarea
            value={form.tellIt.join("\n")}
            onChange={(e) => setForm({ ...form, tellIt: e.target.value.split("\n") })}
            rows={5}
            required
            className={input}
          />
        </label>

        <label className="block">
          <span className={label}>Ask them (one question per line)</span>
          <textarea
            value={form.askThem.join("\n")}
            onChange={(e) => setForm({ ...form, askThem: e.target.value.split("\n") })}
            rows={3}
            required
            className={input}
          />
        </label>

        <fieldset className="rounded-xl border-2 border-border p-4">
          <legend className="px-1 text-sm font-bold">Memory verse</legend>
          <label className="mt-2 block">
            <span className={label}>Text</span>
            <textarea
              value={form.memoryVerse.text}
              onChange={(e) => setForm({ ...form, memoryVerse: { ...form.memoryVerse, text: e.target.value } })}
              rows={2}
              required
              className={input}
            />
          </label>
          <label className="mt-3 block">
            <span className={label}>Reference</span>
            <input
              value={form.memoryVerse.reference}
              onChange={(e) =>
                setForm({ ...form, memoryVerse: { ...form.memoryVerse, reference: e.target.value } })
              }
              required
              className={input}
            />
          </label>
          <label className="mt-3 block">
            <span className={label}>Hand motions (one per line)</span>
            <textarea
              value={form.memoryVerse.motions.join("\n")}
              onChange={(e) =>
                setForm({
                  ...form,
                  memoryVerse: { ...form.memoryVerse, motions: e.target.value.split("\n") },
                })
              }
              rows={3}
              required
              className={input}
            />
          </label>
        </fieldset>

        <fieldset className="rounded-xl border-2 border-border p-4">
          <legend className="px-1 text-sm font-bold">Games (first game shown)</legend>
          <label className="mt-2 block">
            <span className={label}>Title</span>
            <input
              value={form.games[0]?.title ?? ""}
              onChange={(e) => {
                const games = [...form.games];
                games[0] = { ...games[0]!, title: e.target.value };
                setForm({ ...form, games });
              }}
              required
              className={input}
            />
          </label>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Minutes</span>
              <input
                type="number"
                min={1}
                value={form.games[0]?.minutes ?? 5}
                onChange={(e) => {
                  const games = [...form.games];
                  games[0] = { ...games[0]!, minutes: Number(e.target.value) };
                  setForm({ ...form, games });
                }}
                className={input}
              />
            </label>
            <label className="block">
              <span className={label}>Supplies</span>
              <input
                value={form.games[0]?.supplies ?? ""}
                onChange={(e) => {
                  const games = [...form.games];
                  games[0] = { ...games[0]!, supplies: e.target.value };
                  setForm({ ...form, games });
                }}
                className={input}
              />
            </label>
          </div>
          <label className="mt-3 block">
            <span className={label}>Steps (one per line)</span>
            <textarea
              value={(form.games[0]?.steps ?? []).join("\n")}
              onChange={(e) => {
                const games = [...form.games];
                games[0] = { ...games[0]!, steps: e.target.value.split("\n") };
                setForm({ ...form, games });
              }}
              rows={3}
              required
              className={input}
            />
          </label>
        </fieldset>

        <fieldset className="rounded-xl border-2 border-border p-4">
          <legend className="px-1 text-sm font-bold">Object lesson</legend>
          <label className="mt-2 block">
            <span className={label}>Title</span>
            <input
              value={form.objectLesson.title}
              onChange={(e) =>
                setForm({ ...form, objectLesson: { ...form.objectLesson, title: e.target.value } })
              }
              required
              className={input}
            />
          </label>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Minutes</span>
              <input
                type="number"
                min={1}
                value={form.objectLesson.minutes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    objectLesson: { ...form.objectLesson, minutes: Number(e.target.value) },
                  })
                }
                className={input}
              />
            </label>
            <label className="block">
              <span className={label}>Supplies</span>
              <input
                value={form.objectLesson.supplies}
                onChange={(e) =>
                  setForm({ ...form, objectLesson: { ...form.objectLesson, supplies: e.target.value } })
                }
                className={input}
              />
            </label>
          </div>
          <label className="mt-3 block">
            <span className={label}>Steps (one per line)</span>
            <textarea
              value={form.objectLesson.steps.join("\n")}
              onChange={(e) =>
                setForm({
                  ...form,
                  objectLesson: { ...form.objectLesson, steps: e.target.value.split("\n") },
                })
              }
              rows={3}
              required
              className={input}
            />
          </label>
        </fieldset>

        <fieldset className="rounded-xl border-2 border-border p-4">
          <legend className="px-1 text-sm font-bold">Coloring page</legend>
          <label className="mt-2 block">
            <span className={label}>Image URL</span>
            <input
              value={form.coloringPage.image}
              onChange={(e) =>
                setForm({ ...form, coloringPage: { ...form.coloringPage, image: e.target.value } })
              }
              required
              className={input}
            />
          </label>
          <label className="mt-3 block">
            <span className={label}>Alt text</span>
            <input
              value={form.coloringPage.alt}
              onChange={(e) =>
                setForm({ ...form, coloringPage: { ...form.coloringPage, alt: e.target.value } })
              }
              required
              className={input}
            />
          </label>
          <label className="mt-3 block">
            <span className={label}>Caption</span>
            <input
              value={form.coloringPage.caption}
              onChange={(e) =>
                setForm({ ...form, coloringPage: { ...form.coloringPage, caption: e.target.value } })
              }
              required
              className={input}
            />
          </label>
        </fieldset>

        <label className="block">
          <span className={label}>Closing prayer</span>
          <textarea
            value={form.prayer}
            onChange={(e) => setForm({ ...form, prayer: e.target.value })}
            rows={2}
            required
            className={input}
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            className="h-4 w-4 accent-primary"
          />
          Featured on the Builder page
        </label>

        {error && (
          <p className="rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-bold text-primary-foreground disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {saving ? "Saving…" : isNew ? "Create story" : "Save changes"}
        </button>
      </form>
    </main>
  );
}