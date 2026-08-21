import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Copy,
  Gamepad2,
  Heart,
  Lightbulb,
  Loader2,
  Palette,
  Printer,
  Sparkles,
} from "lucide-react";
import { sharingApi, lessonPdfApi } from "@/api/endpoints";
import { useAuth } from "@/lib/auth";
import { downloadBlob } from "@/lib/download";
import { useState } from "react";
import { NarrationPlayer } from "@/components/NarrationPlayer";
import { NarrationSettingsPanel } from "@/components/NarrationSettings";
import { Panel, ActivityCard } from "@/components/LessonPanels";
import { friendlyErrorMessage } from "@/lib/errorMessages";

export function SharedLessonPage() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [duplicating, setDuplicating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["shared-lesson", token],
    queryFn: () => sharingApi.getByToken(token!),
    enabled: Boolean(token),
    retry: false,
  });
  const lesson = data?.lesson;

  const onDuplicate = async () => {
    if (!token) return;
    setDuplicating(true);
    try {
      const { lesson: copy } = await sharingApi.duplicateFromToken(token);
      navigate(`/lesson/${copy.id}`);
    } catch (err) {
      window.alert(friendlyErrorMessage(err, "Couldn't save a copy. Please try again."));
    } finally {
      setDuplicating(false);
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

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !lesson) {
    return (
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-16 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold">This link isn't available</h1>
        <p className="mt-2 text-muted-foreground">
          It may have been turned off, or the link may be incorrect.
        </p>
        <Link to="/" className="mt-6 inline-block font-bold text-accent underline">
          Go to Kids Sermon Builder
        </Link>
      </main>
    );
  }

  const active = new Set(lesson.activeModules as unknown as string[]);

  return (
    <main className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
      <div className="no-print flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
          Shared lesson · view only
        </span>
        {user ? (
          <button
            type="button"
            onClick={onDuplicate}
            disabled={duplicating}
            className="ml-auto flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {duplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            Duplicate to My Lessons
          </button>
        ) : (
          <Link
            to="/login"
            state={{ from: `/shared/${token}` }}
            className="ml-auto text-sm font-bold text-accent underline"
          >
            Log in to save a copy
          </Link>
        )}
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={downloadingPdf}
          className="flex items-center gap-2 rounded-full bg-berry px-4 py-2 text-sm font-bold text-berry-foreground disabled:opacity-60"
        >
          {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Download PDF
        </button>
      </div>

      <article className="mt-6 space-y-6">
        <div className="paper-card print-block overflow-hidden">
          {lesson.illustration && (
            <img
              src={lesson.illustration.url}
              alt={lesson.title}
              className="h-64 w-full bg-secondary object-cover sm:h-80"
            />
          )}
          <div className="p-6">
            <p className="font-display text-sm font-bold uppercase tracking-widest text-primary">
              {lesson.bibleReference} · {lesson.ageGroup}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold">{lesson.title}</h1>
            <p className="mt-2 text-lg font-bold text-accent">Big idea: {lesson.bigIdea}</p>
            {lesson.reviewRequired && (
              <p className="mt-3 rounded-xl border-2 border-accent/40 bg-accent/10 px-4 py-2 text-sm font-bold text-accent">
                AI-generated content should be reviewed for Scripture accuracy before teaching.
              </p>
            )}
          </div>
        </div>

        <NarrationSettingsPanel />

        {active.has("story") && (
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
        )}

        {active.has("verse") && (
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
        )}

        {active.has("games") && lesson.games.length > 0 && (
          <Panel icon={Gamepad2} title="Games & activities" tint="leaf">
            <div className="grid gap-4 sm:grid-cols-2">
              {lesson.games.map((g) => (
                <ActivityCard key={g.title} activity={g} />
              ))}
            </div>
          </Panel>
        )}

        {active.has("object") && (
          <Panel icon={Lightbulb} title="Object lesson" tint="berry">
            <ActivityCard activity={lesson.objectLesson} />
          </Panel>
        )}

        {active.has("coloring") && lesson.coloringPage && (
          <Panel icon={Palette} title="Coloring page" tint="primary">
            <div className="grid gap-5 sm:grid-cols-[minmax(0,320px)_1fr] sm:items-center">
              <img
                src={lesson.coloringPage.image}
                alt={lesson.coloringPage.alt}
                className="w-full rounded-xl border-2 border-border bg-card"
              />
              <p className="text-lg font-bold">{lesson.coloringPage.caption}</p>
            </div>
          </Panel>
        )}

        {active.has("prayer") && (
          <Panel icon={Heart} title="Closing prayer" tint="accent">
            <p className="font-display text-xl font-bold leading-relaxed">{lesson.prayer}</p>
          </Panel>
        )}
      </article>
    </main>
  );
}



