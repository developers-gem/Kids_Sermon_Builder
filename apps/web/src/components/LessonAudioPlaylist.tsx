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

  /**
   * Component mounted.
   *
   * This is intentionally very obvious so we can confirm
   * that the deployed frontend is actually using this file.
   */
  useEffect(() => {
    console.log(
      "🔥🔥🔥 LESSON AUDIO PLAYLIST COMPONENT LOADED 🔥🔥🔥"
    );

    console.log("Lesson ID:", lessonId);
    console.log("Number of tracks:", tracks.length);

    return () => {
      console.log("🧹 Destroying LessonAudioPlaylist");

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }

      audioRef.current = null;
    };
  }, [lessonId, tracks.length]);

  /**
   * Stop current audio.
   */
  const stop = () => {
    console.log("⏹️ STOP AUDIO");

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
    setError(null);
  };

  /**
   * Attach all audio events.
   */
  const attachAudioEvents = (
    audio: HTMLAudioElement,
    trackIndex: number
  ) => {
    audio.onplay = () => {
      console.log("🎵 AUDIO PLAY EVENT");

      setPlaying(true);
    };

    audio.onpause = () => {
      console.log("⏸️ AUDIO PAUSE EVENT");

      setPlaying(false);
    };

    audio.onended = () => {
      console.log("🏁 AUDIO ENDED");

      if (trackIndex < tracks.length - 1) {
        console.log(
          "➡️ Moving to next track:",
          trackIndex + 1
        );

        void generateAndPlay(trackIndex + 1);
      } else {
        console.log("✅ ALL TRACKS FINISHED");

        setPlaying(false);
        setIndex(trackIndex);
      }
    };

    audio.onerror = () => {
      console.error("❌ HTML AUDIO ERROR");

      console.error({
        src: audio.src,
        error: audio.error,
        errorCode: audio.error?.code,
        errorMessage: audio.error?.message,
        readyState: audio.readyState,
        networkState: audio.networkState,
      });

      setPlaying(false);
      setLoading(false);

      setError(
        "The generated audio file could not be loaded. Please try again."
      );
    };

    audio.onloadedmetadata = () => {
      console.log("✅ AUDIO METADATA LOADED");

      console.log({
        duration: audio.duration,
        readyState: audio.readyState,
        networkState: audio.networkState,
      });
    };

    audio.oncanplay = () => {
      console.log("✅ AUDIO CAN PLAY");
    };

    audio.oncanplaythrough = () => {
      console.log("✅ AUDIO CAN PLAY THROUGH");
    };

    audio.onwaiting = () => {
      console.log("⏳ AUDIO WAITING");
    };

    audio.onstalled = () => {
      console.warn("⚠️ AUDIO STALLED");
    };

    audio.onabort = () => {
      console.warn("⚠️ AUDIO ABORTED");
    };
  };

  /**
   * Create an HTML audio element from the generated URL.
   */
  const createAudioElement = (
    url: string,
    trackIndex: number
  ): HTMLAudioElement => {
    console.log("🎧 Creating HTMLAudioElement");

    console.log("Audio URL:", url);

    const audio = new Audio();

    audio.preload = "auto";

    /**
     * Set CORS explicitly.
     *
     * This is useful when the generated media is served
     * from a different domain.
     */
    audio.crossOrigin = "anonymous";

    audio.src = url;

    attachAudioEvents(audio, trackIndex);

    audioRef.current = audio;

    return audio;
  };

  /**
   * Generate the audio through the backend.
   *
   * NOTE:
   * This function does NOT immediately call audio.play().
   */
  const generateAudio = async (
    trackIndex: number
  ): Promise<HTMLAudioElement> => {
    const track = tracks[trackIndex];

    if (!track) {
      throw new Error("Invalid narration track.");
    }

    console.log("======================================");
    console.log("🎙️ STARTING TTS GENERATION");
    console.log("======================================");

    console.log("Lesson ID:", lessonId);
    console.log("Module ID:", track.moduleId);
    console.log("Label:", track.label);
    console.log("Voice:", settings.voice);
    console.log("Style:", settings.style);
    console.log("Text length:", track.text.length);

    const result = await audioApi.generate(
      lessonId,
      track.moduleId,
      {
        text: track.text,
        voice: settings.voice,
        style: settings.style,
      }
    );

    console.log("✅ TTS API RESPONSE:");
    console.log(result);

    const url = result.url;

    console.log("🎧 GENERATED AUDIO URL:");
    console.log(url);

    if (!url) {
      throw new Error(
        "The TTS API returned an empty audio URL."
      );
    }

    /**
     * Stop previous audio.
     */
    if (audioRef.current) {
      console.log("🧹 Removing previous audio");

      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();

      audioRef.current = null;
    }

    const audio = createAudioElement(
      url,
      trackIndex
    );

    /**
     * Start loading the audio file.
     */
    console.log("📥 Loading audio file");

    audio.load();

    /**
     * Wait until the browser can play the audio.
     */
    await new Promise<void>((resolve, reject) => {
      let finished = false;

      const cleanup = () => {
        audio.removeEventListener(
          "canplay",
          handleCanPlay
        );

        audio.removeEventListener(
          "loadedmetadata",
          handleMetadata
        );

        audio.removeEventListener(
          "error",
          handleError
        );
      };

      const handleCanPlay = () => {
        if (finished) return;

        finished = true;

        cleanup();

        console.log(
          "✅ Browser reports that audio can play"
        );

        resolve();
      };

      const handleMetadata = () => {
        console.log(
          "ℹ️ Audio metadata received",
          {
            duration: audio.duration,
            readyState: audio.readyState,
          }
        );

        /**
         * Sometimes metadata is enough for the browser
         * to allow playback.
         */
        if (audio.readyState >= 3) {
          handleCanPlay();
        }
      };

      const handleError = () => {
        if (finished) return;

        finished = true;

        cleanup();

        console.error(
          "❌ Browser failed to load audio"
        );

        reject(
          new Error(
            "The browser could not load the generated audio file."
          )
        );
      };

      audio.addEventListener(
        "canplay",
        handleCanPlay
      );

      audio.addEventListener(
        "loadedmetadata",
        handleMetadata
      );

      audio.addEventListener(
        "error",
        handleError
      );
    });

    return audio;
  };

  /**
   * Generate audio and then attempt playback.
   */
  const generateAndPlay = async (
    trackIndex: number
  ) => {
    if (
      trackIndex < 0 ||
      trackIndex >= tracks.length
    ) {
      stop();
      return;
    }

    setError(null);
    setIndex(trackIndex);
    setLoading(true);

    try {
      const audio = await generateAudio(
        trackIndex
      );

      console.log(
        "▶️ Attempting automatic playback"
      );

      try {
        await audio.play();

        console.log(
          "✅ AUTOMATIC PLAYBACK SUCCEEDED"
        );

        setPlaying(true);
      } catch (playError) {
        console.error(
          "❌ AUTOMATIC PLAYBACK FAILED"
        );

        console.error(playError);

        if (
          playError instanceof DOMException
        ) {
          console.error(
            "Playback error name:",
            playError.name
          );

          console.error(
            "Playback error message:",
            playError.message
          );
        }

        /**
         * IMPORTANT:
         *
         * The audio file itself may be perfectly valid.
         * The browser may simply require another direct
         * user interaction.
         */
        setPlaying(false);

        setError(
          "Audio is ready. Tap Play again to start playback."
        );
      }
    } catch (err) {
      console.error(
        "❌ TTS / AUDIO GENERATION ERROR"
      );

      console.error(err);

      setPlaying(false);

      setError(
        friendlyErrorMessage(
          err,
          "Couldn't generate the narration."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Play/Pause button.
   *
   * When an audio element already exists, this function
   * directly calls audio.play() from the button click.
   *
   * That is important for browser autoplay policies.
   */
  const onPlayPause = async () => {
    console.log("======================================");
    console.log("🖱️ PLAY / PAUSE BUTTON CLICKED");
    console.log("======================================");

    setError(null);

    /**
     * No audio exists.
     *
     * Generate first track.
     */
    if (
      index === null ||
      !audioRef.current
    ) {
      console.log(
        "🎙️ No audio exists yet."
      );

      console.log(
        "Starting first track."
      );

      await generateAndPlay(0);

      return;
    }

    const audio = audioRef.current;

    /**
     * Audio currently playing.
     */
    if (!audio.paused) {
      console.log(
        "⏸️ Pausing current audio"
      );

      audio.pause();

      return;
    }

    /**
     * Audio exists and is paused.
     *
     * This play() is directly triggered by
     * the user's button click.
     */
    console.log(
      "▶️ User clicked Play/Resume"
    );

    console.log(
      "Attempting direct audio.play()"
    );

    try {
      await audio.play();

      console.log(
        "✅ DIRECT USER PLAYBACK SUCCEEDED"
      );

      setPlaying(true);
    } catch (err) {
      console.error(
        "❌ DIRECT USER PLAYBACK FAILED"
      );

      console.error(err);

      setPlaying(false);

      if (
        err instanceof DOMException &&
        err.name === "NotAllowedError"
      ) {
        setError(
          "Playback was blocked by the browser. Tap Play again."
        );
      } else if (
        err instanceof DOMException &&
        err.name === "NotSupportedError"
      ) {
        setError(
          "This browser cannot play this audio file."
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
    if (
      index === null ||
      index === 0 ||
      loading
    ) {
      return;
    }

    console.log(
      "⏮️ Previous track"
    );

    void generateAndPlay(index - 1);
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

    console.log(
      "⏭️ Next track"
    );

    void generateAndPlay(index + 1);
  };

  const current =
    index !== null
      ? tracks[index]
      : null;

  return (
    <section className="no-print rounded-2xl border-2 border-border bg-card p-5">
      <h3 className="font-display text-lg font-bold">
        Play whole lesson
      </h3>

      <p className="mt-1 text-sm text-muted-foreground">
        Plays through {tracks.length} section
        {tracks.length === 1 ? "" : "s"} back to back —
        story, memory verse, games, object lesson,
        and closing prayer.
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
            / {tracks.length} ·{" "}
            {current.label}
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