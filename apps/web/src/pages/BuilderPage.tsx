import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  Gamepad2,
  Heart,
  Lightbulb,
  Loader2,
  MoveDown,
  MoveUp,
  Palette,
  Printer,
  RotateCcw,
  Save,
  Sparkles,
  Timer,
} from "lucide-react";
import type { Story } from "@ksb/types";
import { LESSON_MODULES } from "@ksb/constants";
import { storiesApi, lessonsApi } from "@/api/endpoints";
import { useAuth } from "@/lib/auth";
import { STORY_IMAGES, COLORING_IMAGES } from "@/assets/storyImages";
import { NarrationPlayer } from "@/components/NarrationPlayer";
import { NarrationSettingsPanel } from "@/components/NarrationSettings";
import { Panel, ActivityCard } from "@/components/LessonPanels";
import { friendlyErrorMessage } from "@/lib/errorMessages";

type Block = (typeof LESSON_MODULES)[number]["id"];

const ICONS: Record<string, typeof BookOpen> = {
  BookOpen,
  Sparkles,
  Gamepad2,
  Lightbulb,
  Palette,
  Heart,
};

const MODULE_META: Record<
  Block,
  { icon: typeof BookOpen; title: string; tint: "primary" | "accent" | "leaf" | "berry" }
> = {
  story: { icon: BookOpen, title: "Tell the story", tint: "primary" },
  verse: { icon: Sparkles, title: "Memory verse", tint: "accent" },
  games: { icon: Gamepad2, title: "Games & activities", tint: "leaf" },
  object: { icon: Lightbulb, title: "Object lesson", tint: "berry" },
  coloring: { icon: Palette, title: "Coloring page", tint: "primary" },
  prayer: { icon: Heart, title: "Closing prayer", tint: "accent" },
};

const DEFAULT_ORDER = LESSON_MODULES.map((b) => b.id);

export function BuilderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stories"],
    queryFn: () => storiesApi.list(),
  });
  const stories = useMemo(() => data?.stories ?? [], [data]);

  // const [storyId, setStoryId] = useState<string | null>(null);
  const [storySlug, setStorySlug] = useState<string | null>(null);
  // Order matters here — unlike a plain toggle set, this array's order IS
  // the run-sheet order, which is what makes "move up/down" and "reset
  // recommended order" (Prompt 09) meaningful instead of cosmetic.
  const [active, setActive] = useState<Block[]>(DEFAULT_ORDER);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

 const story: Story | undefined = useMemo(() => {
  if (stories.length === 0) return undefined;

  return stories.find((s) => s.slug === storySlug) ?? stories[0];
}, [stories, storySlug]);

  const has = (b: Block) => active.includes(b);
  const toggle = (b: Block) =>
    setActive((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  const resetOrder = () => setActive((prev) => DEFAULT_ORDER.filter((b) => prev.includes(b)));
  const moveModule = (b: Block, direction: -1 | 1) => {
    setActive((prev) => {
      const i = prev.indexOf(b);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  };
  const minutes = LESSON_MODULES.filter((b) => has(b.id)).reduce((sum, b) => sum + b.minutes, 0);
  const isDefaultOrder = active.every((b, i) => b === DEFAULT_ORDER.filter((x) => active.includes(x))[i]);

  const onSaveToMyLessons = async () => {
    if (!story) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { lesson } = await lessonsApi.createFromStory({ storyId: story.id, activeModules: active });
      navigate(`/lesson/${lesson.id}`);
    } catch (err) {
      setSaveError(friendlyErrorMessage(err, "Couldn't save this lesson. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
      <header className="no-print">
        <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-accent">
          Sunday school kit
        </p>
        <h1 className="mt-2 max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Children&rsquo;s Sermon Builder
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">
          Pick a story, keep the pieces you want, and print a ready-to-teach plan with visuals,
          memory verse motions, games, an object lesson and a coloring page.
        </p>
      </header>

      {isError && (
        <p className="no-print mt-8 rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
          Couldn't load stories from the server. Is the backend running?
        </p>
      )}

    <section className="no-print mt-8">
  <h2 className="font-display text-lg font-bold">
    1. Choose a Bible story
  </h2>

  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {isLoading &&
      Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="paper-card h-56 animate-pulse bg-secondary/50"
        />
      ))}

    {stories.map((s) => {
      const selected = story?.slug === s.slug;

      return (
        <button
          key={s.slug}
          type="button"
          onClick={() => setStorySlug(s.slug)}
          className={`paper-card overflow-hidden text-left transition-transform hover:-translate-y-1 ${
            selected
              ? "ring-4 ring-primary/50"
              : ""
          }`}
        >
          <img
            src={STORY_IMAGES[s.slug] ?? s.image}
            alt={s.imageAlt}
            width={1024}
            height={768}
            loading="lazy"
            className="h-36 w-full bg-secondary object-cover"
          />

          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-lg font-bold leading-snug">
                {s.title}
              </h3>

              {selected && (
                <span className="mt-1 rounded-full bg-primary p-1 text-primary-foreground">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              {s.reference}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent">
                {s.theme}
              </span>

              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">
                {s.ageRange}
              </span>
            </div>
          </div>
        </button>
      );
    })}
  </div>
</section>

      {story && (
        <>
          <section className="no-print mt-10">
            <h2 className="font-display text-lg font-bold">2. Build the run sheet</h2>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {LESSON_MODULES.map((b) => {
                const on = has(b.id);
                const Icon = ICONS[b.icon] ?? BookOpen;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggle(b.id)}
                    className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {b.label}
                  </button>
                );
              })}
              {!isDefaultOrder && (
                <button
                  type="button"
                  onClick={resetOrder}
                  className="flex items-center gap-2 rounded-full border-2 border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:border-primary"
                >
                  <RotateCcw className="h-4 w-4" /> Reset recommended order
                </button>
              )}
              <span className="ml-auto flex items-center gap-2 rounded-full bg-leaf/15 px-4 py-2 text-sm font-bold text-leaf">
                <Timer className="h-4 w-4" /> about {minutes} min
              </span>
              {user && (
                <button
                  type="button"
                  onClick={onSaveToMyLessons}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-full bg-leaf px-4 py-2 text-sm font-bold text-leaf-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving…" : "Save to My Lessons"}
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-full bg-berry px-4 py-2 text-sm font-bold text-berry-foreground transition-transform hover:-translate-y-0.5"
              >
                <Printer className="h-4 w-4" /> Print plan
              </button>
            </div>
            {saveError && (
              <p className="mt-3 rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
                {saveError}
              </p>
            )}
            {!user && (
              <p className="mt-3 text-sm text-muted-foreground">
                <Link to="/login" className="font-bold text-accent underline">
                  Log in
                </Link>{" "}
                to save this lesson to My Lessons.
              </p>
            )}
          </section>

          <article className="mt-10 space-y-6">
            <div className="paper-card print-block overflow-hidden">
              <img
                src={STORY_IMAGES[story.slug] ?? story.image}
                alt={story.imageAlt}
                width={1024}
                height={768}
                className="h-56 w-full bg-secondary object-cover sm:h-72"
              />
              <div className="p-6">
                <p className="font-display text-sm font-bold uppercase tracking-widest text-primary">
                  {story.reference} · {story.ageRange}
                </p>
                <h2 className="mt-1 text-3xl font-extrabold">{story.title}</h2>
                <p className="mt-2 text-lg font-bold text-accent">Big idea: {story.bigIdea}</p>
              </div>
            </div>

            <NarrationSettingsPanel />

            {active.map((moduleId, idx) => {
              const meta = MODULE_META[moduleId];
              const moveControls = (
                <div className="no-print ml-auto flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveModule(moduleId, -1)}
                    disabled={idx === 0}
                    aria-label="Move up"
                    className="rounded-full border-2 border-border p-1.5 text-muted-foreground hover:border-primary disabled:opacity-30"
                  >
                    <MoveUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveModule(moduleId, 1)}
                    disabled={idx === active.length - 1}
                    aria-label="Move down"
                    className="rounded-full border-2 border-border p-1.5 text-muted-foreground hover:border-primary disabled:opacity-30"
                  >
                    <MoveDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              );

              if (moduleId === "story") {
                return (
                  <Panel key={moduleId} icon={meta.icon} title={meta.title} tint={meta.tint}>
                    {moveControls}
                    <ol className="space-y-3">
                      {story.tellIt.map((line, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {i + 1}
                          </span>
                          <p>{line}</p>
                        </li>
                      ))}
                    </ol>
                    <NarrationPlayer
                      label="Story narration"
                      lessonId={`story:${story.slug}`}
                      moduleId="story"
                      text={[story.title, `Big idea: ${story.bigIdea}`, ...story.tellIt].join(" ")}
                    />
                    <h4 className="mt-6 font-display font-bold">Ask them</h4>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                      {story.askThem.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </Panel>
                );
              }

              if (moduleId === "verse") {
                return (
                  <Panel key={moduleId} icon={meta.icon} title={meta.title} tint={meta.tint}>
                    {moveControls}
                    <blockquote className="rounded-xl bg-secondary p-5 text-center">
                      <p className="font-display text-2xl font-bold leading-snug">
                        &ldquo;{story.memoryVerse.text}&rdquo;
                      </p>
                      <cite className="mt-2 block text-sm font-bold not-italic text-muted-foreground">
                        {story.memoryVerse.reference}
                      </cite>
                    </blockquote>
                    <NarrationPlayer
                      label="Memory verse"
                      lessonId={`story:${story.slug}`}
                      moduleId="verse"
                      text={`${story.memoryVerse.text} — ${story.memoryVerse.reference}`}
                    />
                    <h4 className="mt-5 font-display font-bold">Hand motions</h4>
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {story.memoryVerse.motions.map((m) => (
                        <li key={m} className="rounded-lg border-2 border-border px-3 py-2 text-sm">
                          {m}
                        </li>
                      ))}
                    </ul>
                  </Panel>
                );
              }

              if (moduleId === "games") {
                return (
                  <Panel key={moduleId} icon={meta.icon} title={meta.title} tint={meta.tint}>
                    {moveControls}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {story.games.map((g) => (
                        <ActivityCard key={g.title} activity={g} />
                      ))}
                    </div>
                  </Panel>
                );
              }

              if (moduleId === "object") {
                return (
                  <Panel key={moduleId} icon={meta.icon} title={meta.title} tint={meta.tint}>
                    {moveControls}
                    <ActivityCard activity={story.objectLesson} />
                  </Panel>
                );
              }

              if (moduleId === "coloring" && story.coloringPage) {
                return (
                  <Panel key={moduleId} icon={meta.icon} title={meta.title} tint={meta.tint}>
                    {moveControls}
                    <div className="grid gap-5 sm:grid-cols-[minmax(0,320px)_1fr] sm:items-center">
                      <img
                        src={COLORING_IMAGES[story.slug] ?? story.coloringPage.image}
                        alt={story.coloringPage.alt}
                        width={800}
                        height={1024}
                        loading="lazy"
                        className="w-full rounded-xl border-2 border-border bg-card"
                      />
                      <div>
                        <p className="text-lg font-bold">{story.coloringPage.caption}</p>
                        <p className="mt-2 text-muted-foreground">
                          Print one per child. Set out crayons while you tell the story so little hands stay
                          busy and ears stay open.
                        </p>
                        <a
                          href={COLORING_IMAGES[story.slug] ?? story.coloringPage.image}
                          download={`${story.id}-coloring-page.jpg`}
                          className="no-print mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                        >
                          <Printer className="h-4 w-4" /> Download page
                        </a>
                      </div>
                    </div>
                  </Panel>
                );
              }

              if (moduleId === "prayer") {
                return (
                  <Panel key={moduleId} icon={meta.icon} title={meta.title} tint={meta.tint}>
                    {moveControls}
                    <p className="font-display text-xl font-bold leading-relaxed">{story.prayer}</p>
                  </Panel>
                );
              }

              return null;
            })}
          </article>

          <p className="no-print mt-10 text-sm text-muted-foreground">
            Want the full set at a glance?{" "}
            <Link to="/library" className="font-bold text-accent underline">
              Browse the story library
            </Link>
            .
          </p>
        </>
      )}
    </main>
  );
}