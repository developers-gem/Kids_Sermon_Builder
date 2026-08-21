import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { NARRATION_VOICES, useNarrationSettings } from "@/lib/narration";
import { audioApi } from "@/api/endpoints";
import { friendlyErrorMessage } from "@/lib/errorMessages";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function NarrationPlayer({
  text,
  label,
  lessonId,
  moduleId,
}: {
  text: string;
  label: string;
  /** A real Lesson id once saved, or "story:<slug>" for a built-in story preview. */
  lessonId: string;
  moduleId: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { settings } = useNarrationSettings();
  const settingsKey = `${settings.voice}|${settings.style}`;

  useEffect(() => {
    setUrl(null);
    setPlaying(false);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    audioRef.current?.pause();
    audioRef.current = null;
  }, [text, settingsKey]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const play = (src: string) => {
    const audio = audioRef.current ?? new Audio(src);
    audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    audio.onpause = () => setPlaying(false);
    audio.onplay = () => setPlaying(true);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ondurationchange = () => setDuration(audio.duration);
    void audio.play().catch(() => setError("Playback was blocked. Tap play again."));
  };

  const onClick = async () => {
    setError(null);
    if (playing) {
      audioRef.current?.pause();
      return;
    }
    if (url) {
      play(url);
      return;
    }
    setLoading(true);
    try {
      const { url: audioUrl } = await audioApi.generate(lessonId, moduleId, {
        text,
        voice: settings.voice,
        style: settings.style,
      });
      setUrl(audioUrl);
      play(audioUrl);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Narration failed."));
    } finally {
      setLoading(false);
    }
  };

  const onRestart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    void audio.play();
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const value = Number(e.target.value);
    audio.currentTime = value;
    setCurrentTime(value);
  };

  return (
    <div className="no-print mt-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onClick}
          disabled={loading}
          className="flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2 text-sm font-bold transition-colors hover:border-primary disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : playing ? (
            <Pause className="h-4 w-4" />
          ) : url ? (
            <Play className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
          {loading ? "Preparing audio…" : playing ? "Pause" : `Listen: ${label}`}
        </button>
        {url && !loading && (
          <button
            type="button"
            onClick={onRestart}
            aria-label="Restart"
            title="Restart from the beginning"
            className="rounded-full border-2 border-border p-2 text-muted-foreground hover:border-primary"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        {url && !loading && (
          <a
            href={url}
            download={`${label.toLowerCase().replace(/\s+/g, "-")}.mp3`}
            className="text-sm font-bold text-accent underline"
          >
            Download
          </a>
        )}
        {!loading && (
          <span className="text-xs font-bold text-muted-foreground">
            {NARRATION_VOICES.find((v) => v.id === settings.voice)?.name ?? settings.voice} ·{" "}
            {settings.style.replace("-", " ")}
          </span>
        )}
      </div>
      {url && duration > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentTime}
            onChange={onSeek}
            aria-label={`Seek ${label}`}
            className="h-1.5 w-full max-w-xs cursor-pointer appearance-none rounded-full bg-border accent-primary"
          />
          <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatTime(duration)}
          </span>
        </div>
      )}
      {error && <span className="text-sm font-bold text-destructive">{error}</span>}
    </div>
  );
}
