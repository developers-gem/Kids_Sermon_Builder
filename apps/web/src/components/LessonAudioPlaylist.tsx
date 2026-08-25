import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
} from "lucide-react";
import { useNarrationSettings } from "@/lib/narration";
import { audioApi } from "@/api/endpoints";
import { friendlyErrorMessage } from "@/lib/errorMessages";

export interface PlaylistTrack {
  moduleId: string;
  label: string;
  text: string;
}

export function LessonAudioPlaylist({
  lessonId,
  tracks,
}: {
  lessonId: string;
  tracks: PlaylistTrack[];
}) {
  const [index, setIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { settings } = useNarrationSettings();

  useEffect(() => {
    console.log("🔥 NEW LESSON AUDIO PLAYLIST FILE LOADED");

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      audioRef.current = null;
    };
  }, []);

  /**
   * Completely stop the current audio.
   */
  const stop = () => {
    console.log("Stopping audio");

    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }

    audioRef.current = null;

    setIndex(null);
    setPlaying(false);
    setLoading(false);
  };

  /**
   * Create an audio element and wait until the browser has
   * loaded enough information before trying to play it.
   */
  const createAudio = async (url: string, trackIndex: number) => {
    console.log("Creating audio element");
    console.log("Audio URL:", url);

    const audio = new Audio();

    audio.preload = "auto";
    audio.src = url;

    audioRef.current = audio;

    audio.onplay = () => {
      console.log("🎵 AUDIO PLAYING");
      setPlaying(true);
    };

    audio.onpause = () => {
      console.log("⏸️ AUDIO PAUSED");
      setPlaying(false);
    };

    audio.onended = () => {
      console.log("🏁 AUDIO ENDED");

      if (trackIndex + 1 < tracks.length) {
        void loadAndPlay(trackIndex + 1);
      } else {
        setPlaying(false);
        setIndex(trackIndex);
      }
    };

    audio.onerror = () => {
      console.error("❌ AUDIO ELEMENT ERROR", {
        error: audio.error,
        src: audio.src,
        networkState: audio.networkState,
        readyState: audio.readyState,
      });

      setPlaying(false);
      setLoading(false);
      setError(
        "The audio file could not be loaded. Please try again."
      );
    };

    /**
     * Wait until the browser knows about the audio file.
     */
    await new Promise<void>((resolve, reject) => {
      const onLoadedMetadata = () => {
        cleanup();

        console.log("✅ AUDIO METADATA LOADED", {
          duration: audio.duration,
          readyState: audio.readyState,
        });

        resolve();
      };

      const onCanPlay = () => {
        cleanup();

        console.log("✅ AUDIO CAN PLAY");

        resolve();
      };

      const onError = () => {
        cleanup();

        reject(
          new Error("The browser could not load the generated audio.")
        );
      };

      const cleanup = () => {
        audio.removeEventListener(
          "loadedmetadata",
          onLoadedMetadata
        );
        audio.removeEventListener("canplay", onCanPlay);
        audio.removeEventListener("error", onError);
      };

      audio.addEventListener(
        "loadedmetadata",
        onLoadedMetadata,
        { once: true }
      );

      audio.addEventListener(
        "canplay",
        onCanPlay,
        { once: true }
      );

      audio.addEventListener(
        "error",
        onError,
        { once: true }
      );

      audio.load();
    });

    return audio;
  };

  /**
   * Generate/load a narration and play it.
   */
  const loadAndPlay = async (i: number) => {
    console.log("=================================");
    console.log("loadAndPlay called:", i);
    console.log("=================================");

    if (i < 0 || i >= tracks.length) {
      stop();
      return;
    }

    setError(null);
    setIndex(i);
    setLoading(true);

    try {
      const track = tracks[i]!;

      console.log("🎙️ Generating narration");
      console.log("Lesson ID:", lessonId);
      console.log("Module ID:", track.moduleId);
      console.log("Voice:", settings.voice);
      console.log("Style:", settings.style);
      console.log("Text length:", track.text.length);

      /**
       * Generate/retrieve audio from backend.
       */
      const result = await audioApi.generate(
        lessonId,
        track.moduleId,
        {
          text: track.text,
          voice: settings.voice,
          style: settings.style,
        }
      );

      console.log("✅ TTS API RESULT:", result);

      const { url } = result;

      console.log("🎧 TTS AUDIO URL:", url);

      if (!url) {
        throw new Error("TTS API returned an empty audio URL.");
      }

      /**
       * Stop old audio.
       */
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.load();
      }

      /**
       * Create the new audio object.
       */
      const audio = await createAudio(url, i);

      /**
       * IMPORTANT:
       *
       * The browser may reject programmatic playback if the
       * original click is no longer considered an active user
       * gesture after the async API request.
       */
      console.log("▶️ Attempting audio.play()");

      try {
        await audio.play();

        console.log("✅ audio.play() succeeded");

        setPlaying(true);
      } catch (playError) {
        console.error("❌ audio.play() FAILED", playError);

        if (
          playError instanceof DOMException &&
          playError.name === "NotAllowedError"
        ) {
          setError(
            "Browser blocked automatic playback. Tap Play again to start the audio."
          );
        } else if (
          playError instanceof DOMException &&
          playError.name === "NotSupportedError"
        ) {
          setError(
            "This browser cannot play the generated audio format."
          );
        } else {
          setError(
            "The audio could not start. Please tap Play again."
          );
        }

        setPlaying(false);
      }
    } catch (err) {
      console.error("❌ AUDIO PLAYLIST ERROR:", err);

      setError(
        friendlyErrorMessage(
          err,
          "Couldn't generate or play this section."
        )
      );

      setPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Play / pause button.
   */
  const onPlayPause = async () => {
    console.log("🖱️ PLAY BUTTON CLICKED");

    setError(null);

    /**
     * No audio exists yet.
     *
     * This is the first click.
     */
    if (index === null || !audioRef.current) {
      console.log("Starting first track");

      await loadAndPlay(0);

      return;
    }

    const audio = audioRef.current;

    /**
     * Currently playing -> pause.
     */
    if (!audio.paused) {
      console.log("Pausing audio");

      audio.pause();

      return;
    }

    /**
     * Audio exists but is paused.
     *
     * IMPORTANT:
     * This play() happens directly inside the button click,
     * so browser autoplay restrictions should not block it.
     */
    console.log("Resuming audio directly from button click");

    try {
      await audio.play();

      console.log("✅ Resume successful");

      setPlaying(true);
    } catch (err) {
      console.error("❌ Resume failed:", err);

      setPlaying(false);

      if (
        err instanceof DOMException &&
        err.name === "NotAllowedError"
      ) {
        setError(
          "Playback was blocked by the browser. Tap Play again."
        );
      } else {
        setError(
          "The audio could not be played. Please try again."
        );
      }
    }
  };

  /**
   * Previous track.
   */
  const onPrevious = () => {
    if (index === null || index === 0 || loading) {
      return;
    }

    console.log("Previous track");

    void loadAndPlay(index - 1);
  };

  /**
   * Next track.
   */
  const onNext = () => {
    if (
      index === null ||
      index >= tracks.length - 1 ||
      loading
    ) {
      return;
    }

    console.log("Next track");

    void loadAndPlay(index + 1);
  };

  const current =
    index !== null ? tracks[index] : null;

  return (
    <section className="no-print rounded-2xl border-2 border-border bg-card p-5">
      <h3 className="font-display text-lg font-bold">
        Play whole lesson
      </h3>

      <p className="mt-1 text-sm text-muted-foreground">
        Plays through {tracks.length} section
        {tracks.length === 1 ? "" : "s"} back to back — story,
        memory verse, games, object lesson, and closing prayer.
      </p>

      <div className="mt-4 flex items-center gap-2">
        {/* Previous */}
        <button
          type="button"
          onClick={onPrevious}
          disabled={
            index === null ||
            index === 0 ||
            loading
          }
          aria-label="Previous section"
          className="rounded-full border-2 border-border p-2 text-muted-foreground hover:border-primary disabled:opacity-30"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        {/* Play / Pause */}
        <button
          type="button"
          onClick={onPlayPause}
          disabled={
            loading ||
            tracks.length === 0
          }
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}

          {loading
            ? "Loading…"
            : playing
              ? "Pause"
              : index === null
                ? "Play all"
                : "Resume"}
        </button>

        {/* Next */}
        <button
          type="button"
          onClick={onNext}
          disabled={
            index === null ||
            index >= tracks.length - 1 ||
            loading
          }
          aria-label="Next section"
          className="rounded-full border-2 border-border p-2 text-muted-foreground hover:border-primary disabled:opacity-30"
        >
          <SkipForward className="h-4 w-4" />
        </button>

        {/* Stop */}
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

        {/* Current track */}
        {current && (
          <span className="ml-auto text-sm font-bold text-muted-foreground">
            {index !== null
              ? index + 1
              : 0}{" "}
            / {tracks.length} · {current.label}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 rounded-xl border-2 border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-bold text-destructive">
            {error}
          </p>

          <button
            type="button"
            onClick={onPlayPause}
            className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Tap Play Again
          </button>
        </div>
      )}
    </section>
  );
}