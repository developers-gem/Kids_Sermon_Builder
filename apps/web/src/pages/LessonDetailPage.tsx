import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Copy,
  Gamepad2,
  Heart,
  History,
  Lightbulb,
  Loader2,
  MoveDown,
  MoveUp,
  Palette,
  Pencil,
  Printer,
  RotateCcw,
  Save,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import type { Lesson } from "@ksb/types";
import {
  lessonsApi,
  lessonVersionsApi,
  lessonRegenerateApi,
  coloringPageApi,
  lessonPdfApi,
  sharingApi,
  type LessonContentEdit,
} from "@/api/endpoints";
import { useAuth } from "@/lib/auth";
import { downloadBlob } from "@/lib/download";
import { NarrationPlayer } from "@/components/NarrationPlayer";
import { NarrationSettingsPanel } from "@/components/NarrationSettings";
import { LessonAudioPlaylist, type PlaylistTrack } from "@/components/LessonAudioPlaylist";
import { Panel, ActivityCard } from "@/components/LessonPanels";
import { friendlyErrorMessage } from "@/lib/errorMessages";

const MODULE_META: Record<
  string,
  { icon: typeof BookOpen; title: string; tint: "primary" | "accent" | "leaf" | "berry" }
> = {
  story: { icon: BookOpen, title: "Tell the story", tint: "primary" },
  verse: { icon: Sparkles, title: "Memory verse", tint: "accent" },
  games: { icon: Gamepad2, title: "Games & activities", tint: "leaf" },
  object: { icon: Lightbulb, title: "Object lesson", tint: "berry" },
  coloring: { icon: Palette, title: "Coloring page", tint: "primary" },
  prayer: { icon: Heart, title: "Closing prayer", tint: "accent" },
};

function toEditState(lesson: Lesson): LessonContentEdit {
  return {
    title: lesson.title,
    bigIdea: lesson.bigIdea,
    story: [...(lesson.story ?? [])],
    askThem: [...(lesson.askThem ?? [])],
    memoryVerse: {
      text: lesson.memoryVerse?.text ?? "",
      reference: lesson.memoryVerse?.reference ?? "",
      motions: [...(lesson.memoryVerse?.motions ?? [])],
    },
    games: (lesson.games ?? []).map((g) => ({
      ...g,
      minutes: Number(g.minutes) || 5,
      steps: [...(g.steps ?? [])],
    })),
    objectLesson: {
      title: lesson.objectLesson?.title ?? "",
      minutes: Number(lesson.objectLesson?.minutes) || 5,
      supplies: lesson.objectLesson?.supplies ?? "",
      steps: [...(lesson.objectLesson?.steps ?? [])],
    },
    coloringPage: lesson.coloringPage?.caption
      ? { caption: lesson.coloringPage.caption }
      : undefined,
    prayer: lesson.prayer ?? "",
  };
}

export function LessonDetailPage() {
  const params = useParams<{ id?: string; _id?: string; lessonId?: string }>();
  const activeId = params.id ?? params._id ?? params.lessonId;
  const isIdValid = Boolean(activeId) && activeId !== "undefined";

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lesson", activeId],
    queryFn: () => lessonsApi.getById(activeId!),
    enabled: isIdValid,
  });
  const lesson = data?.lesson;

  // Resolve ID with fallback for both MongoDB _id and id properties
  const lessonId = (lesson as any)?.id ?? (lesson as any)?._id ?? activeId;
  const userId = (user as any)?._id ?? (user as any)?.id;
  const ownerId = (lesson as any)?.ownerId ?? (lesson as any)?.userId;
  const isOwner = Boolean(user && lesson && (ownerId === userId || !ownerId));

  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState<LessonContentEdit | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);
  const [regenerateOpenFor, setRegenerateOpenFor] = useState<string | null>(null);
  const [regenerateInstruction, setRegenerateInstruction] = useState("");
  const [regeneratingModule, setRegeneratingModule] = useState<string | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [versionLabel, setVersionLabel] = useState("");
  const [savingVersion, setSavingVersion] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [generatingColoring, setGeneratingColoring] = useState(false);
  const [coloringError, setColoringError] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [sharingBusy, setSharingBusy] = useState(false);

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ["lesson-versions", lessonId],
    queryFn: () => lessonVersionsApi.list(lessonId!),
    enabled: Boolean(lessonId) && lessonId !== "undefined" && showVersions,
  });
  const versions = versionsData?.versions ?? [];

  useEffect(() => {
    if (lesson) setEdit(toEditState(lesson));
  }, [lesson]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["lesson", activeId] });
    queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
    queryClient.invalidateQueries({ queryKey: ["lessons"] });
  };

  const onToggleFavorite = async () => {
    if (!lesson || !lessonId) return;
    await (lesson.isFavorite ? lessonsApi.unfavorite(lessonId) : lessonsApi.favorite(lessonId));
    invalidate();
  };

  const onToggleArchive = async () => {
    if (!lesson || !lessonId) return;
    await (lesson.isArchived ? lessonsApi.unarchive(lessonId) : lessonsApi.archive(lessonId));
    invalidate();
  };

  const onDelete = async () => {
    if (!lesson || !lessonId) return;
    if (!window.confirm(`Delete "${lesson.title}"? This can't be undone.`)) return;
    await lessonsApi.remove(lessonId);
    navigate("/my-lessons", { replace: true });
  };

  const onDuplicate = async () => {
    if (!lesson || !lessonId) return;
    const { lesson: copy } = await lessonsApi.duplicate(lessonId);
    const copyId = (copy as any)?.id ?? (copy as any)?._id;
    navigate(`/lesson/${copyId}`);
  };

  const onDownloadPdf = async () => {
    if (!lesson || !lessonId) return;
    setDownloadingPdf(true);
    try {
      const blob = await lessonPdfApi.download(lessonId);
      downloadBlob(blob, `${lesson.title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    } catch (err) {
      window.alert(friendlyErrorMessage(err, "Couldn't download the PDF. Please try again."));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const onDownloadColoringPagePdf = async () => {
    if (!lesson || !lessonId) return;
    setDownloadingPdf(true);
    try {
      const blob = await lessonPdfApi.downloadColoringPage(lessonId);
      downloadBlob(blob, `${lesson.title.toLowerCase().replace(/\s+/g, "-")}-coloring-page.pdf`);
    } catch (err) {
      window.alert(friendlyErrorMessage(err, "Couldn't download the PDF. Please try again."));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const onGenerateColoringPage = async () => {
    if (!lesson || !lessonId) return;
    if (
      lesson.coloringPage &&
      !window.confirm("Generate a new coloring page? This replaces the current one (you can restore it from version history).")
    ) {
      return;
    }
    setGeneratingColoring(true);
    setColoringError(null);
    try {
      await coloringPageApi.generate(lessonId);
      invalidate();
    } catch (err) {
      setColoringError(
        friendlyErrorMessage(err, "Couldn't generate a coloring page. Please try again."),
      );
    } finally {
      setGeneratingColoring(false);
    }
  };

  const onCreateShareLink = async () => {
    if (!lesson || !lessonId) return;
    setSharingBusy(true);
    try {
      const { token } = await sharingApi.create(lessonId);
      setShareLink(`${window.location.origin}/shared/${token}`);
      invalidate();
    } catch (err) {
      window.alert(friendlyErrorMessage(err, "Couldn't create a share link. Please try again."));
    } finally {
      setSharingBusy(false);
    }
  };

  const onRevokeShare = async () => {
    if (!lesson || !lessonId) return;
    if (!window.confirm("Turn off sharing? The existing link will stop working.")) return;
    setSharingBusy(true);
    try {
      await sharingApi.revoke(lessonId);
      setShareLink(null);
      invalidate();
    } catch (err) {
      window.alert(friendlyErrorMessage(err, "Couldn't turn off sharing. Please try again."));
    } finally {
      setSharingBusy(false);
    }
  };

  const onCopyShareLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {
      // Clipboard access can be blocked by browser
    }
  };

  const onSaveVersion = async () => {
    if (!lesson || !lessonId) return;
    setSavingVersion(true);
    try {
      await lessonVersionsApi.save(lessonId, versionLabel.trim());
      setVersionLabel("");
      queryClient.invalidateQueries({ queryKey: ["lesson-versions", lessonId] });
    } finally {
      setSavingVersion(false);
    }
  };

  const onRestoreVersion = async (versionId: string, label: string) => {
    if (!lesson || !lessonId) return;
    const name = label || "this version";
    if (!window.confirm(`Restore ${name}? Your current content will be saved as a version first.`)) return;
    setRestoringId(versionId);
    try {
      await lessonVersionsApi.restore(lessonId, versionId);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["lesson-versions", lessonId] });
    } finally {
      setRestoringId(null);
    }
  };

  const onStartEdit = () => {
    if (lesson) setEdit(toEditState(lesson));
    setIsEditing(true);
    setSaveError(null);
  };

  const onCancelEdit = () => {
    if (lesson) setEdit(toEditState(lesson));
    setIsEditing(false);
    setSaveError(null);
  };

  const onSaveEdit = async () => {
  if (!lesson || !lessonId || !edit) return;
  setSaving(true);
  setSaveError(null);
  try {
    const payload: LessonContentEdit = {
      ...edit,
      story: edit.story.map((s) => s.trim()).filter(Boolean),
      askThem: edit.askThem.map((q) => q.trim()).filter(Boolean),
      memoryVerse: {
        ...edit.memoryVerse,
        motions: edit.memoryVerse.motions.map((m) => m.trim()).filter(Boolean),
      },
      games: edit.games.map((g) => ({
        ...g,
        minutes: Number(g.minutes) || 5,
        steps: g.steps.map((s) => s.trim()).filter(Boolean),
      })),
      objectLesson: {
        ...edit.objectLesson,
        minutes: Number(edit.objectLesson.minutes) || 5,
        steps: edit.objectLesson.steps.map((s) => s.trim()).filter(Boolean),
      },
      // Only include coloringPage if a valid non-empty caption exists
      coloringPage: edit.coloringPage?.caption?.trim()
        ? { caption: edit.coloringPage.caption.trim() }
        : undefined,
      prayer: edit.prayer.trim(),
    };

    await lessonsApi.updateContent(lessonId, payload);
    setIsEditing(false);
    invalidate();
  } catch (err) {
    setSaveError(friendlyErrorMessage(err, "Couldn't save your changes. Please try again."));
  } finally {
    setSaving(false);
  }
};

  const onMoveModule = async (moduleId: string, direction: -1 | 1) => {
    if (!lesson || !lessonId) return;
    const order = [...(lesson.activeModules ?? [])];
    const i = order.indexOf(moduleId as never);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j]!, order[i]!];
    setReordering(moduleId);
    try {
      await lessonsApi.reorderModules(lessonId, order);
      invalidate();
    } finally {
      setReordering(null);
    }
  };

  const onRegenerateModule = async (moduleId: string) => {
    if (!lesson || !lessonId) return;
    setRegeneratingModule(moduleId);
    setRegenerateError(null);
    try {
      await lessonRegenerateApi.regenerateModule(lessonId, moduleId, regenerateInstruction.trim());
      setRegenerateOpenFor(null);
      setRegenerateInstruction("");
      invalidate();
    } catch (err) {
      setRegenerateError(
        friendlyErrorMessage(err, "Couldn't regenerate this section. Please try again."),
      );
    } finally {
      setRegeneratingModule(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !lesson || !edit) {
    return (
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-16 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold">Lesson not found</h1>
        <p className="mt-2 text-muted-foreground">
          It may have been deleted, or you may not have access to it.
        </p>
        <Link to="/my-lessons" className="mt-6 inline-block font-bold text-accent underline">
          Back to My Lessons
        </Link>
      </main>
    );
  }

  const activeModules = (lesson.activeModules ?? []) as unknown as string[];

  const playlistTracks: PlaylistTrack[] = activeModules
    .map((moduleId): PlaylistTrack | null => {
      switch (moduleId) {
        case "story":
          return {
            moduleId: "story",
            label: "Story",
            text: [lesson.title, lesson.bigIdea, ...(lesson.story ?? [])].join(" "),
          };
        case "verse":
          return {
            moduleId: "verse",
            label: "Memory verse",
            text: `${lesson.memoryVerse?.text ?? ""} — ${lesson.memoryVerse?.reference ?? ""}`,
          };
        case "games":
          return (lesson.games ?? []).length > 0
            ? {
                moduleId: "games",
                label: "Games & activities",
                text: (lesson.games ?? [])
                  .map((g) => `${g.title}. Supplies: ${g.supplies}. ${(g.steps ?? []).join(" ")}`)
                  .join(" Next game. "),
              }
            : null;
        case "object":
          return {
            moduleId: "object",
            label: "Object lesson",
            text: `${lesson.objectLesson?.title ?? ""}. Supplies: ${lesson.objectLesson?.supplies ?? ""}. ${(lesson.objectLesson?.steps ?? []).join(" ")}`,
          };
        case "prayer":
          return { moduleId: "prayer", label: "Closing prayer", text: lesson.prayer ?? "" };
        default:
          return null;
      }
    })
    .filter((t): t is PlaylistTrack => t !== null);

  return (
    <main className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
      <div className="no-print flex flex-wrap items-center gap-2">
        {isOwner && (
          <button
            type="button"
            onClick={onToggleFavorite}
            className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors ${
              lesson.isFavorite
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-muted-foreground hover:border-accent"
            }`}
          >
            {lesson.isFavorite ? <Star className="h-4 w-4 fill-current" /> : <Heart className="h-4 w-4" />}
            {lesson.isFavorite ? "Favorited" : "Favorite"}
          </button>
        )}
        {isOwner && (
          <button
            type="button"
            onClick={onToggleArchive}
            className="flex items-center gap-2 rounded-full border-2 border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:border-primary"
          >
            {lesson.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {lesson.isArchived ? "Restore" : "Archive"}
          </button>
        )}
        {isOwner && !isEditing && (
          <button
            type="button"
            onClick={onStartEdit}
            className="flex items-center gap-2 rounded-full border-2 border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:border-primary"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
        )}
        {isOwner && (
          <button
            type="button"
            onClick={onDuplicate}
            className="flex items-center gap-2 rounded-full border-2 border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:border-primary"
          >
            <Copy className="h-4 w-4" /> Duplicate
          </button>
        )}
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowVersions((v) => !v)}
            className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold ${
              showVersions
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            <History className="h-4 w-4" /> Version history
          </button>
        )}
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowShare((v) => !v)}
            className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold ${
              showShare
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
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
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-full border-2 border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:border-primary"
        >
          <Printer className="h-4 w-4" /> Print
        </button>
        {isOwner && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto flex items-center gap-2 rounded-full border-2 border-destructive/40 px-4 py-2 text-sm font-bold text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
      </div>

      {isOwner && showShare && (
        <div className="no-print mt-4 rounded-2xl border-2 border-border bg-card p-5">
          <h3 className="font-display text-lg font-bold">Share this lesson</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Anyone with the link can view, listen, and download it — they can't edit the original.
          </p>
          {shareLink ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                readOnly
                value={shareLink}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Share link"
                className="min-w-64 flex-1 rounded-xl border-2 border-border bg-background px-4 py-2 text-sm outline-none"
              />
              <button
                type="button"
                onClick={onCopyShareLink}
                className="flex items-center gap-2 rounded-full border-2 border-border px-4 py-2 text-sm font-bold hover:border-primary"
              >
                <Copy className="h-4 w-4" /> Copy
              </button>
              <button
                type="button"
                onClick={onRevokeShare}
                disabled={sharingBusy}
                className="flex items-center gap-2 rounded-full border-2 border-destructive/40 px-4 py-2 text-sm font-bold text-destructive hover:bg-destructive/10 disabled:opacity-60"
              >
                <X className="h-4 w-4" /> Turn off sharing
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onCreateShareLink}
              disabled={sharingBusy}
              className="mt-4 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {sharingBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              Create share link
            </button>
          )}
        </div>
      )}

      {isOwner && showVersions && (
        <div className="no-print mt-4 rounded-2xl border-2 border-border bg-card p-5">
          <h3 className="font-display text-lg font-bold">Version history</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Save a snapshot of this lesson's content, or restore an earlier one. Restoring automatically saves the current version first, so you can always undo it.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="Label this version (optional)"
              aria-label="Version label"
              className="min-w-48 flex-1 rounded-xl border-2 border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={onSaveVersion}
              disabled={savingVersion}
              className="flex items-center gap-2 rounded-full bg-leaf px-4 py-2 text-sm font-bold text-leaf-foreground disabled:opacity-60"
            >
              {savingVersion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save current version
            </button>
          </div>

          <ul className="mt-4 space-y-2">
            {versionsLoading && <li className="h-12 animate-pulse rounded-xl bg-secondary/50" />}
            {!versionsLoading && versions.length === 0 && (
              <li className="text-sm text-muted-foreground">No saved versions yet.</li>
            )}
            {versions.map((v: any) => {
              const versionEntryId = v.id ?? v._id;
              return (
                <li
                  key={versionEntryId}
                  className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-border px-4 py-2"
                >
                  <span className="font-bold">{v.label || "Untitled version"}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(v.createdAt).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRestoreVersion(versionEntryId, v.label)}
                    disabled={restoringId !== null}
                    className="ml-auto flex items-center gap-2 rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-primary disabled:opacity-60"
                  >
                    {restoringId === versionEntryId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    Restore
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isEditing && (
        <div className="no-print sticky top-2 z-10 mt-4 flex items-center gap-3 rounded-2xl border-2 border-primary bg-card px-4 py-3 shadow-lg">
          <Pencil className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">Editing — simple text changes only, no AI regeneration.</span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={saving}
              className="flex items-center gap-2 rounded-full border-2 border-border px-4 py-2 text-sm font-bold hover:border-destructive/50 disabled:opacity-60"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={saving}
              className="flex items-center gap-2 rounded-full bg-leaf px-4 py-2 text-sm font-bold text-leaf-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
      {saveError && (
        <p className="no-print mt-3 rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
          {saveError}
        </p>
      )}

      <article className="mt-6 space-y-6">
        <div className="paper-card print-block overflow-hidden">
          {lesson.illustration?.url && (
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
            {isEditing ? (
              <>
                <input
                  value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                  aria-label="Lesson title"
                  className="mt-2 w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-3xl font-extrabold outline-none focus:border-primary"
                />
                <input
                  value={edit.bigIdea}
                  onChange={(e) => setEdit({ ...edit, bigIdea: e.target.value })}
                  aria-label="Big idea"
                  className="mt-2 w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-lg font-bold text-accent outline-none focus:border-primary"
                  placeholder="Big idea"
                />
              </>
            ) : (
              <>
                <h1 className="mt-1 text-3xl font-extrabold">{lesson.title}</h1>
                <p className="mt-2 text-lg font-bold text-accent">Big idea: {lesson.bigIdea}</p>
              </>
            )}
            {lesson.reviewRequired && (
              <div className="mt-3 rounded-xl border-2 border-accent/40 bg-accent/10 px-4 py-3">
                <p className="text-sm font-bold text-accent">
                  AI-generated content should be reviewed for Scripture accuracy before teaching.
                </p>
                {(lesson.validationWarnings ?? []).length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-accent/90">
                    {(lesson.validationWarnings ?? []).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        <NarrationSettingsPanel />

        {playlistTracks.length > 1 && <LessonAudioPlaylist lessonId={lessonId} tracks={playlistTracks} />}

        {activeModules.map((moduleId, idx) => {
          const meta = MODULE_META[moduleId];
          if (!meta) return null;

          const moveControls = isOwner && !isEditing && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onMoveModule(moduleId, -1)}
                disabled={idx === 0 || reordering !== null}
                aria-label="Move up"
                className="rounded-full border-2 border-border p-1.5 text-muted-foreground hover:border-primary disabled:opacity-30"
              >
                <MoveUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveModule(moduleId, 1)}
                disabled={idx === activeModules.length - 1 || reordering !== null}
                aria-label="Move down"
                className="rounded-full border-2 border-border p-1.5 text-muted-foreground hover:border-primary disabled:opacity-30"
              >
                <MoveDown className="h-3.5 w-3.5" />
              </button>
            </div>
          );

          const isRegenOpen = regenerateOpenFor === moduleId;
          const isRegenBusy = regeneratingModule === moduleId;
          const toolbar = isOwner && !isEditing && (
            <div className="no-print mb-4 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRegenerateOpenFor(isRegenOpen ? null : moduleId);
                    setRegenerateInstruction("");
                    setRegenerateError(null);
                  }}
                  disabled={regeneratingModule !== null}
                  className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-bold disabled:opacity-60 ${
                    isRegenOpen
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  <Wand2 className="h-3.5 w-3.5" /> Regenerate with AI
                </button>
                {moveControls}
              </div>
              {isRegenOpen && (
                <div className="flex flex-wrap gap-2 rounded-xl border-2 border-primary/40 bg-primary/5 p-3">
                  <input
                    value={regenerateInstruction}
                    onChange={(e) => setRegenerateInstruction(e.target.value)}
                    placeholder="Optional: how should this change? (e.g. simpler for younger kids)"
                    className="min-w-56 flex-1 rounded-lg border-2 border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => onRegenerateModule(moduleId)}
                    disabled={isRegenBusy}
                    className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
                  >
                    {isRegenBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {isRegenBusy ? "Generating…" : "Regenerate"}
                  </button>
                </div>
              )}
              {regenerateError && isRegenOpen && (
                <p className="rounded-lg border-2 border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
                  {regenerateError}
                </p>
              )}
            </div>
          );

          if (moduleId === "story") {
            return (
              <Panel key={moduleId} icon={meta.icon} title={meta.title} tint={meta.tint}>
                {toolbar}
                {isEditing ? (
                  <textarea
                    value={edit.story.join("\n")}
                    onChange={(e) => setEdit({ ...edit, story: e.target.value.split("\n") })}
                    rows={5}
                    aria-label="Story paragraphs"
                    className="w-full rounded-lg border-2 border-border bg-background p-3 text-sm outline-none focus:border-primary"
                    placeholder="One paragraph per line"
                  />
                ) : (
                  <ol className="space-y-3">
                    {(lesson.story ?? []).map((line, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {i + 1}
                        </span>
                        <p>{line}</p>
                      </li>
                    ))}
                  </ol>
                )}
                {!isEditing && (
                  <NarrationPlayer
                    label="Story narration"
                    lessonId={lessonId}
                    moduleId="story"
                    text={[lesson.title, lesson.bigIdea, ...(lesson.story ?? [])].join(" ")}
                  />
                )}
                <h4 className="mt-6 font-display font-bold">Ask them</h4>
                {isEditing ? (
                  <textarea
                    value={edit.askThem.join("\n")}
                    onChange={(e) => setEdit({ ...edit, askThem: e.target.value.split("\n") })}
                    rows={3}
                    aria-label="Discussion questions"
                    className="mt-2 w-full rounded-lg border-2 border-border bg-background p-3 text-sm outline-none focus:border-primary"
                    placeholder="One question per line"
                  />
                ) : (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                    {(lesson.askThem ?? []).map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                )}
              </Panel>
            );
          }

          if (moduleId === "verse") {
            return (
              <Panel key={moduleId} icon={meta.icon} title={meta.title} tint={meta.tint}>
                {toolbar}
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={edit.memoryVerse.text}
                      onChange={(e) =>
                        setEdit({ ...edit, memoryVerse: { ...edit.memoryVerse, text: e.target.value } })
                      }
                      rows={2}
                      aria-label="Memory verse text"
                      className="w-full rounded-lg border-2 border-border bg-background p-3 text-sm outline-none focus:border-primary"
                      placeholder="Verse text"
                    />
                    <input
                      value={edit.memoryVerse.reference}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          memoryVerse: { ...edit.memoryVerse, reference: e.target.value },
                        })
                      }
                      aria-label="Memory verse reference"
                      className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="Reference"
                    />
                    <textarea
                      value={edit.memoryVerse.motions.join("\n")}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          memoryVerse: { ...edit.memoryVerse, motions: e.target.value.split("\n") },
                        })
                      }
                      rows={3}
                      aria-label="Hand motions"
                      className="w-full rounded-lg border-2 border-border bg-background p-3 text-sm outline-none focus:border-primary"
                      placeholder="One hand motion per line"
                    />
                  </div>
                ) : (
                  <>
                    <blockquote className="rounded-xl bg-secondary p-5 text-center">
                      <p className="font-display text-2xl font-bold leading-snug">
                        &ldquo;{lesson.memoryVerse?.text}&rdquo;
                      </p>
                      <cite className="mt-2 block text-sm font-bold not-italic text-muted-foreground">
                        {lesson.memoryVerse?.reference}
                      </cite>
                    </blockquote>
                    <NarrationPlayer
                      label="Memory verse"
                      lessonId={lessonId}
                      moduleId="verse"
                      text={`${lesson.memoryVerse?.text ?? ""} — ${lesson.memoryVerse?.reference ?? ""}`}
                    />
                    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                      {(lesson.memoryVerse?.motions ?? []).map((m) => (
                        <li key={m} className="rounded-lg border-2 border-border px-3 py-2 text-sm">
                          {m}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Panel>
            );
          }

          if (moduleId === "games" && (lesson.games ?? []).length > 0) {
            return (
              <Panel key={moduleId} icon={meta.icon} title={meta.title} tint={meta.tint}>
                {toolbar}
                {isEditing ? (
                  <div className="space-y-4">
                    {edit.games.map((g, gi) => (
                      <div key={gi} className="rounded-xl border-2 border-border p-4">
                        <input
                          value={g.title}
                          onChange={(e) => {
                            const games = [...edit.games];
                            games[gi] = { ...g, title: e.target.value };
                            setEdit({ ...edit, games });
                          }}
                          aria-label={`Game ${gi + 1} title`}
                          className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm font-bold outline-none focus:border-primary"
                        />
                        <textarea
                          value={g.steps.join("\n")}
                          onChange={(e) => {
                            const games = [...edit.games];
                            games[gi] = { ...g, steps: e.target.value.split("\n") };
                            setEdit({ ...edit, games });
                          }}
                          rows={3}
                          aria-label={`Game ${gi + 1} steps`}
                          className="mt-2 w-full rounded-lg border-2 border-border bg-background p-3 text-sm outline-none focus:border-primary"
                          placeholder="One step per line"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(lesson.games ?? []).map((g) => (
                      <ActivityCard key={g.title} activity={g} />
                    ))}
                  </div>
                )}
                {!isEditing && (
                  <NarrationPlayer
                    label="Games & activities"
                    lessonId={lessonId}
                    moduleId="games"
                    text={(lesson.games ?? [])
                      .map((g) => `${g.title}. Supplies: ${g.supplies}. ${(g.steps ?? []).join(" ")}`)
                      .join(" Next game. ")}
                  />
                )}
              </Panel>
            );
          }

          if (moduleId === "object") {
            return (
              <Panel key={moduleId} icon={meta.icon} title={meta.title} tint={meta.tint}>
                {toolbar}
                {isEditing ? (
                  <div className="rounded-xl border-2 border-border p-4">
                    <input
                      value={edit.objectLesson.title}
                      onChange={(e) =>
                        setEdit({ ...edit, objectLesson: { ...edit.objectLesson, title: e.target.value } })
                      }
                      aria-label="Object lesson title"
                      className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm font-bold outline-none focus:border-primary"
                    />
                    <textarea
                      value={edit.objectLesson.steps.join("\n")}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          objectLesson: { ...edit.objectLesson, steps: e.target.value.split("\n") },
                        })
                      }
                      rows={3}
                      aria-label="Object lesson steps"
                      className="mt-2 w-full rounded-lg border-2 border-border bg-background p-3 text-sm outline-none focus:border-primary"
                      placeholder="One step per line"
                    />
                  </div>
                ) : (
                  <ActivityCard activity={lesson.objectLesson} />
                )}
                {!isEditing && (
                  <NarrationPlayer
                    label="Object lesson"
                    lessonId={lessonId}
                    moduleId="object"
                    text={`${lesson.objectLesson?.title ?? ""}. Supplies: ${lesson.objectLesson?.supplies ?? ""}. ${(lesson.objectLesson?.steps ?? []).join(" ")}`}
                  />
                )}
              </Panel>
            );
          }

          if (moduleId === "coloring") {
            return (
              <Panel key={moduleId} icon={meta.icon} title={meta.title} tint={meta.tint}>
                {toolbar}
                {isOwner && !isEditing && (
                  <div className="no-print mb-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onGenerateColoringPage}
                      disabled={generatingColoring}
                      className="flex items-center gap-2 rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-primary disabled:opacity-60"
                    >
                      {generatingColoring ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5" />
                      )}
                      {lesson.coloringPage ? "Regenerate with AI" : "Generate with AI"}
                    </button>
                    {lesson.coloringPage && (
                      <button
                        type="button"
                        onClick={onDownloadColoringPagePdf}
                        disabled={downloadingPdf}
                        className="flex items-center gap-2 rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-primary disabled:opacity-60"
                      >
                        <Printer className="h-3.5 w-3.5" /> Download PDF
                      </button>
                    )}
                    {coloringError && (
                      <p className="w-full rounded-lg border-2 border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
                        {coloringError}
                      </p>
                    )}
                  </div>
                )}
                {lesson.coloringPage ? (
                  <div className="grid gap-5 sm:grid-cols-[minmax(0,320px)_1fr] sm:items-center">
                    <img
                      src={lesson.coloringPage.image}
                      alt={lesson.coloringPage.alt}
                      className="w-full rounded-xl border-2 border-border bg-card"
                    />
                    <div>
                      {isEditing ? (
                        <textarea
                          value={edit.coloringPage.caption}
                          onChange={(e) => setEdit({ ...edit, coloringPage: { caption: e.target.value } })}
                          rows={2}
                          aria-label="Coloring page caption"
                          className="w-full rounded-lg border-2 border-border bg-background p-3 text-sm outline-none focus:border-primary"
                        />
                      ) : (
                        <>
                          <p className="text-lg font-bold">{lesson.coloringPage.caption}</p>
                          <a
                            href={lesson.coloringPage.image}
                            download={`${lessonId}-coloring-page.jpg`}
                            className="no-print mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                          >
                            <Printer className="h-4 w-4" /> Download image
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No coloring page yet.
                    {isOwner ? " Generate one with AI above." : ""}
                  </p>
                )}
              </Panel>
            );
          }

          if (moduleId === "prayer") {
            return (
              <Panel key={moduleId} icon={meta.icon} title={meta.title} tint={meta.tint}>
                {toolbar}
                {isEditing ? (
                  <textarea
                    value={edit.prayer}
                    onChange={(e) => setEdit({ ...edit, prayer: e.target.value })}
                    rows={3}
                    aria-label="Closing prayer"
                    className="w-full rounded-lg border-2 border-border bg-background p-3 text-lg font-bold outline-none focus:border-primary"
                  />
                ) : (
                  <p className="font-display text-xl font-bold leading-relaxed">{lesson.prayer}</p>
                )}
                {!isEditing && (
                  <NarrationPlayer
                    label="Closing prayer"
                    lessonId={lessonId}
                    moduleId="prayer"
                    text={lesson.prayer ?? ""}
                  />
                )}
              </Panel>
            );
          }

          return null;
        })}
      </article>

      <p className="no-print mt-10 text-sm text-muted-foreground">
        <Link to="/my-lessons" className="font-bold text-accent underline">
          Back to My Lessons
        </Link>
      </p>
    </main>
  );
}