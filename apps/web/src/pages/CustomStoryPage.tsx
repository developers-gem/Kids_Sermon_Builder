import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Gamepad2,
  Heart,
  Lightbulb,
  Loader2,
  Palette,
  Pencil,
  Printer,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import type { Lesson } from "@ksb/types";
import { ILLUSTRATION_STYLES, AGE_GROUPS } from "@ksb/constants";
import { aiApi, lessonPdfApi } from "@/api/endpoints";
import { useDrafts, type Draft } from "@/lib/drafts";
import { downloadBlob } from "@/lib/download";
import { NarrationPlayer } from "@/components/NarrationPlayer";
import { NarrationSettingsPanel } from "@/components/NarrationSettings";
import { LessonAudioPlaylist, type PlaylistTrack } from "@/components/LessonAudioPlaylist";
import { Panel, ActivityCard } from "@/components/LessonPanels";
import { friendlyErrorMessage } from "@/lib/errorMessages";

export function CustomStoryPage() {
  const [passage, setPassage] = useState("");
  const [ageGroup, setAgeGroup] = useState<string>(AGE_GROUPS[1]);
  const [style, setStyle] = useState<string>(ILLUSTRATION_STYLES[0].id);
  const [focus, setFocus] = useState("");
  const [withIllustration, setWithIllustration] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const { drafts, ready, saveDraft, renameDraft, deleteDraft } = useDrafts();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passage.trim()) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    setLesson(null);
    try {
      const chosen = ILLUSTRATION_STYLES.find((s) => s.id === style)!;
      const { lesson: created } = await aiApi.generateLesson({
        passage: passage.trim(),
        ageGroup,
        style: chosen.id,
        styleDescription: chosen.description,
        focus: focus.trim(),
        withIllustration,
      });
      setLesson(created);
      setDraftTitle(created.title);
      setDraftId(created.id);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onDownloadPdf = async () => {
    if (!lesson) return;
    setDownloadingPdf(true);
    try {
      const blob = await lessonPdfApi.download(lesson.id);
      downloadBlob(blob, `${lesson.title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    } catch (err) {
      window.alert(friendlyErrorMessage(err, "Couldn't download the PDF. Please try again."));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const onSaveDraft = () => {
    if (!lesson || !draftId) return;
    const warning = saveDraft({
      id: draftId,
      title: draftTitle.trim() || lesson.title,
      form: { passage: passage.trim(), ageGroup, style, focus: focus.trim(), withIllustration },
      lesson,
    });
    setNotice(warning ?? "Saved to this device. This lesson is also stored on the server.");
  };

  const onOpenDraft = (d: Draft) => {
    setPassage(d.form.passage);
    setAgeGroup(d.form.ageGroup);
    setStyle(d.form.style);
    setFocus(d.form.focus);
    setWithIllustration(d.form.withIllustration);
    setLesson(d.lesson);
    setDraftId(d.id);
    setDraftTitle(d.title);
    setError(null);
    setNotice(`Opened “${d.title}” for editing.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDeleteDraft = (d: Draft) => {
    deleteDraft(d.id);
    if (draftId === d.id) setDraftId(null);
    setNotice(`Removed “${d.title}” from this device.`);
  };

  const onRenameDraft = (d: Draft) => {
    const next = window.prompt("Rename this draft", d.title);
    if (!next || !next.trim()) return;
    renameDraft(d.id, next.trim());
    if (draftId === d.id) setDraftTitle(next.trim());
  };

  return (
    <main className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
      <header className="no-print">
        <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-accent">
          Powered by AI
        </p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Custom story builder</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Type any Bible passage, choose how the artwork should look, and get a kid-friendly
          summary with a memory verse, a game, an object lesson and a matching illustration.
        </p>
      </header>

      <form onSubmit={onSubmit} className="paper-card no-print mt-8 space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="font-display font-bold">Bible passage</span>
            <input
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              placeholder="e.g. Jonah 1–3, or Luke 19:1-10"
              className="mt-2 w-full rounded-xl border-2 border-border bg-card px-4 py-3 outline-none focus:border-primary"
              required
            />
          </label>
          <label className="block">
            <span className="font-display font-bold">Age group</span>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="mt-2 w-full rounded-xl border-2 border-border bg-card px-4 py-3 outline-none focus:border-primary"
            >
              {AGE_GROUPS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="font-display font-bold">Teaching focus (optional)</span>
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. forgiveness, obeying the first time, welcoming new friends"
            className="mt-2 w-full rounded-xl border-2 border-border bg-card px-4 py-3 outline-none focus:border-primary"
          />
        </label>

        <fieldset>
          <legend className="font-display font-bold">Illustration style</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {ILLUSTRATION_STYLES.map((s) => {
              const on = s.id === style;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${
                    on
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <span className="font-display font-bold">{s.id}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{s.description}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={withIllustration}
              onChange={(e) => setWithIllustration(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Generate an illustration too
          </label>
          <button
            type="submit"
            disabled={loading}
            className="ml-auto flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
            {loading ? "Writing the story…" : "Generate sermon"}
          </button>
        </div>
        {loading && (
          <p className="text-sm text-muted-foreground">
            This can take up to a minute, especially with an illustration. Hang tight.
          </p>
        )}
        {error && (
          <p className="rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
            {error}
          </p>
        )}
      </form>

      {notice && (
        <p className="no-print mt-4 rounded-xl border-2 border-leaf/40 bg-leaf/10 px-4 py-3 text-sm font-bold">
          {notice}
        </p>
      )}

      {ready && drafts.length > 0 && (
        <section className="paper-card no-print mt-8 p-6">
          <h2 className="text-2xl font-extrabold">Saved on this device</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Shortcuts back to lessons already generated — open one to reuse or re-generate it.
          </p>
          <ul className="mt-4 space-y-3">
            {drafts.map((d) => (
              <li
                key={d.id}
                className={`flex flex-wrap items-center gap-3 rounded-xl border-2 p-3 ${
                  d.id === draftId ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold">{d.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.form.passage} · {d.form.ageGroup} · {d.form.style} ·{" "}
                    {new Date(d.savedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDraft(d)}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => onRenameDraft(d)}
                  aria-label={`Rename ${d.title}`}
                  className="rounded-full border-2 border-border p-2 hover:border-primary"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteDraft(d)}
                  aria-label={`Remove ${d.title}`}
                  className="rounded-full border-2 border-destructive/40 p-2 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lesson && (
        <article className="mt-8 space-y-6">
          <div className="paper-card print-block overflow-hidden">
            {lesson.illustration && (
              <img
                src={lesson.illustration.url}
                alt={`${style} illustration of ${lesson.title}`}
                className="h-64 w-full bg-secondary object-cover sm:h-80"
              />
            )}
            <div className="p-6">
              <p className="font-display text-sm font-bold uppercase tracking-widest text-primary">
                {passage} · {ageGroup} · {style}
              </p>
              <h2 className="mt-1 text-3xl font-extrabold">{lesson.title}</h2>
              <p className="mt-2 text-lg font-bold text-accent">Big idea: {lesson.bigIdea}</p>
              {lesson.reviewRequired && (
                <div className="mt-3 rounded-xl border-2 border-accent/40 bg-accent/10 px-4 py-3">
                  <p className="text-sm font-bold text-accent">
                    AI-generated content should be reviewed for Scripture accuracy before teaching.
                  </p>
                  {lesson.validationWarnings.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-accent/90">
                      {lesson.validationWarnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="no-print mt-4 flex flex-wrap items-center gap-3">
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  aria-label="Draft name"
                  placeholder="Draft name"
                  className="min-w-48 flex-1 rounded-xl border-2 border-border bg-card px-4 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={onSaveDraft}
                  className="flex items-center gap-2 rounded-full bg-leaf px-4 py-2 text-sm font-bold text-leaf-foreground"
                >
                  <Save className="h-4 w-4" /> {draftId ? "Update shortcut" : "Save shortcut"}
                </button>
                <button
                  type="button"
                  onClick={onDownloadPdf}
                  disabled={downloadingPdf}
                  className="flex items-center gap-2 rounded-full bg-berry px-4 py-2 text-sm font-bold text-berry-foreground disabled:opacity-60"
                >
                  {downloadingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-full border-2 border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:border-primary"
                >
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
            </div>
          </div>

          <NarrationSettingsPanel />

          <LessonAudioPlaylist
            lessonId={lesson.id}
            tracks={
              [
                {
                  moduleId: "story",
                  label: "Story",
                  text: [lesson.title, lesson.bigIdea, ...lesson.story].join(" "),
                },
                {
                  moduleId: "verse",
                  label: "Memory verse",
                  text: `${lesson.memoryVerse.text} — ${lesson.memoryVerse.reference}`,
                },
                lesson.games[0]
                  ? {
                      moduleId: "games",
                      label: "Game & activity",
                      text: `${lesson.games[0].title}. Supplies: ${lesson.games[0].supplies}. ${lesson.games[0].steps.join(" ")}`,
                    }
                  : null,
                {
                  moduleId: "object",
                  label: "Object lesson",
                  text: `${lesson.objectLesson.title}. Supplies: ${lesson.objectLesson.supplies}. ${lesson.objectLesson.steps.join(" ")}`,
                },
                { moduleId: "prayer", label: "Closing prayer", text: lesson.prayer },
              ].filter((t): t is PlaylistTrack => t !== null)
            }
          />

          <Panel icon={BookOpen} title="Tell the story" tint="primary">
            <div className="space-y-3">
              {lesson.story.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <NarrationPlayer
              label="Story narration"
              lessonId={lesson.id}
              moduleId="story"
              text={[lesson.title, lesson.bigIdea, ...lesson.story].join(" ")}
            />
            <h4 className="mt-6 font-display font-bold">Ask them</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {lesson.askThem.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </Panel>

          <Panel icon={Sparkles} title="Memory verse" tint="accent">
            <blockquote className="rounded-xl bg-secondary p-5 text-center">
              <p className="font-display text-2xl font-bold leading-snug">
                &ldquo;{lesson.memoryVerse.text}&rdquo;
              </p>
              <cite className="mt-2 block text-sm font-bold not-italic text-muted-foreground">
                {lesson.memoryVerse.reference}
              </cite>
            </blockquote>
            <NarrationPlayer
              label="Memory verse"
              lessonId={lesson.id}
              moduleId="verse"
              text={`${lesson.memoryVerse.text} — ${lesson.memoryVerse.reference}`}
            />
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {lesson.memoryVerse.motions.map((m) => (
                <li key={m} className="rounded-lg border-2 border-border px-3 py-2 text-sm">
                  {m}
                </li>
              ))}
            </ul>
          </Panel>

          {lesson.games[0] && (
            <Panel icon={Gamepad2} title="Game & activity" tint="leaf">
              <ActivityCard activity={lesson.games[0]} />
            </Panel>
          )}

          <Panel icon={Lightbulb} title="Object lesson" tint="berry">
            <ActivityCard activity={lesson.objectLesson} />
          </Panel>

          {lesson.coloringPage && (
            <Panel icon={Palette} title="Coloring page idea" tint="primary">
              <p>{lesson.coloringPage.caption}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Sketch this on a whiteboard or trace the illustration outline for the kids to color.
              </p>
            </Panel>
          )}

          <Panel icon={Heart} title="Closing prayer" tint="accent">
            <p className="font-display text-xl font-bold leading-relaxed">{lesson.prayer}</p>
          </Panel>

          <p className="no-print text-sm text-muted-foreground">
            AI-generated — please read it over and check the Scripture before Sunday. Prefer a
            ready-made lesson?{" "}
            <Link to="/" className="font-bold text-accent underline">
              Use the builder
            </Link>
            .
          </p>
        </article>
      )}
    </main>
  );
}

