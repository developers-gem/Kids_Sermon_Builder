import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, SkipBack, SkipForward, Square } from "lucide-react";
import { useNarrationSettings } from "@/lib/narration";
import { audioApi } from "@/api/endpoints";
import { friendlyErrorMessage } from "@/lib/errorMessages";

export interface PlaylistTrack {
  moduleId: string;
  label: string;
  text: string;
}

export function LessonAudioPlaylist({ lessonId, tracks }: { lessonId: string; tracks: PlaylistTrack[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { settings } = useNarrationSettings();

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setIndex(null);
    setPlaying(false);
  };

  const loadAndPlay = async (i: number) => {
    if (i < 0 || i >= tracks.length) {
      stop();
      return;
    }
    setError(null);
    setIndex(i);
    setLoading(true);
    try {
      const track = tracks[i]!;
      const { url } = await audioApi.generate(lessonId, track.moduleId, {
        text: track.text,
        voice: settings.voice,
        style: settings.style,
      });
      const audio = new Audio(url);
      audioRef.current?.pause();
      audioRef.current = audio;
      audio.onended = () => {
        void loadAndPlay(i + 1);
      };
      audio.onplay = () => setPlaying(true);
      audio.onpause = () => setPlaying(false);
      await audio.play();
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't play this section."));
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  const onPlayPause = () => {
    if (index === null) {
      void loadAndPlay(0);
      return;
    }
    if (playing) {
      audioRef.current?.pause();
    } else {
      void audioRef.current?.play();
    }
  };

  const current = index !== null ? tracks[index] : null;

  return (
    <section className="no-print rounded-2xl border-2 border-border bg-card p-5">
      <h3 className="font-display text-lg font-bold">Play whole lesson</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Plays through {tracks.length} section{tracks.length === 1 ? "" : "s"} back to back —
        story, memory verse, games, object lesson, and closing prayer.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => loadAndPlay((index ?? 0) - 1)}
          disabled={index === null || index === 0 || loading}
          aria-label="Previous section"
          className="rounded-full border-2 border-border p-2 text-muted-foreground hover:border-primary disabled:opacity-30"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onPlayPause}
          disabled={loading || tracks.length === 0}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {loading ? "Loading…" : playing ? "Pause" : index === null ? "Play all" : "Resume"}
        </button>
        <button
          type="button"
          onClick={() => loadAndPlay((index ?? -1) + 1)}
          disabled={index === null || index >= tracks.length - 1 || loading}
          aria-label="Next section"
          className="rounded-full border-2 border-border p-2 text-muted-foreground hover:border-primary disabled:opacity-30"
        >
          <SkipForward className="h-4 w-4" />
        </button>
        {index !== null && (
          <button
            type="button"
            onClick={stop}
            aria-label="Stop"
            className="rounded-full border-2 border-border p-2 text-muted-foreground hover:border-destructive"
          >
            <Square className="h-4 w-4" />
          </button>
        )}
        {current && (
          <span className="ml-auto text-sm font-bold text-muted-foreground">
            {index !== null ? index + 1 : 0} / {tracks.length} · {current.label}
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-sm font-bold text-destructive">{error}</p>}
    </section>
  );
}
