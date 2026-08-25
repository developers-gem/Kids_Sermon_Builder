// import { useEffect, useRef, useState } from "react";
// import { Loader2, Pause, Play, SkipBack, SkipForward, Square } from "lucide-react";
// import { useNarrationSettings } from "@/lib/narration";
// import { audioApi } from "@/api/endpoints";
// import { friendlyErrorMessage } from "@/lib/errorMessages";

// export interface PlaylistTrack {
//   moduleId: string;
//   label: string;
//   text: string;
// }

// export function LessonAudioPlaylist({ lessonId, tracks }: { lessonId: string; tracks: PlaylistTrack[] }) {
//   const [index, setIndex] = useState<number | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [playing, setPlaying] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const audioRef = useRef<HTMLAudioElement | null>(null);
//   const { settings } = useNarrationSettings();

//   useEffect(() => {
//     return () => {
//       audioRef.current?.pause();
//     };
//   }, []);

//   const stop = () => {
//     audioRef.current?.pause();
//     audioRef.current = null;
//     setIndex(null);
//     setPlaying(false);
//   };

//   const loadAndPlay = async (i: number) => {
//     if (i < 0 || i >= tracks.length) {
//       stop();
//       return;
//     }
//     setError(null);
//     setIndex(i);
//     setLoading(true);
//     try {
//       const track = tracks[i]!;
//      const result = await audioApi.generate(lessonId, track.moduleId, {
//   text: track.text,
//   voice: settings.voice,
//   style: settings.style,
// });

// console.log("TTS API RESULT:", result);

// const { url } = result;

// console.log("TTS AUDIO URL:", url);
//       const audio = new Audio(url);
//       audioRef.current?.pause();
//       audioRef.current = audio;
//       audio.onended = () => {
//         void loadAndPlay(i + 1);
//       };
//       audio.onplay = () => setPlaying(true);
//       audio.onpause = () => setPlaying(false);
//       await audio.play();
//     } catch (err) {
//       setError(friendlyErrorMessage(err, "Couldn't play this section."));
//       setPlaying(false);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const onPlayPause = () => {
//     if (index === null) {
//       void loadAndPlay(0);
//       return;
//     }
//     if (playing) {
//       audioRef.current?.pause();
//     } else {
//       void audioRef.current?.play();
//     }
//   };

//   const current = index !== null ? tracks[index] : null;

//   return (
//     <section className="no-print rounded-2xl border-2 border-border bg-card p-5">
//       <h3 className="font-display text-lg font-bold">Play whole lesson</h3>
//       <p className="mt-1 text-sm text-muted-foreground">
//         Plays through {tracks.length} section{tracks.length === 1 ? "" : "s"} back to back —
//         story, memory verse, games, object lesson, and closing prayer.
//       </p>

//       <div className="mt-4 flex items-center gap-2">
//         <button
//           type="button"
//           onClick={() => loadAndPlay((index ?? 0) - 1)}
//           disabled={index === null || index === 0 || loading}
//           aria-label="Previous section"
//           className="rounded-full border-2 border-border p-2 text-muted-foreground hover:border-primary disabled:opacity-30"
//         >
//           <SkipBack className="h-4 w-4" />
//         </button>
//         <button
//           type="button"
//           onClick={onPlayPause}
//           disabled={loading || tracks.length === 0}
//           className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
//         >
//           {loading ? (
//             <Loader2 className="h-4 w-4 animate-spin" />
//           ) : playing ? (
//             <Pause className="h-4 w-4" />
//           ) : (
//             <Play className="h-4 w-4" />
//           )}
//           {loading ? "Loading…" : playing ? "Pause" : index === null ? "Play all" : "Resume"}
//         </button>
//         <button
//           type="button"
//           onClick={() => loadAndPlay((index ?? -1) + 1)}
//           disabled={index === null || index >= tracks.length - 1 || loading}
//           aria-label="Next section"
//           className="rounded-full border-2 border-border p-2 text-muted-foreground hover:border-primary disabled:opacity-30"
//         >
//           <SkipForward className="h-4 w-4" />
//         </button>
//         {index !== null && (
//           <button
//             type="button"
//             onClick={stop}
//             aria-label="Stop"
//             className="rounded-full border-2 border-border p-2 text-muted-foreground hover:border-destructive"
//           >
//             <Square className="h-4 w-4" />
//           </button>
//         )}
//         {current && (
//           <span className="ml-auto text-sm font-bold text-muted-foreground">
//             {index !== null ? index + 1 : 0} / {tracks.length} · {current.label}
//           </span>
//         )}
//       </div>
//       {error && <p className="mt-2 text-sm font-bold text-destructive">{error}</p>}
//     </section>
//   );
// }

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

console.log("🔥 NEW LESSON AUDIO PLAYLIST FILE LOADED");


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

  /*
   * Clean up audio when the component is removed.
   */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  /*
   * Stop current audio completely.
   */
  const stop = () => {
    console.log("TTS: STOP");

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }

    setIndex(null);
    setPlaying(false);
    setLoading(false);
    setError(null);
  };

  /*
   * Generate and play one narration track.
   */
  const loadAndPlay = async (i: number) => {
    if (i < 0 || i >= tracks.length) {
      stop();
      return;
    }

    const track = tracks[i];

    if (!track) {
      console.error("TTS: Track not found", i);
      return;
    }

    setError(null);
    setIndex(i);
    setLoading(true);
    setPlaying(false);

    console.log("========================================");
    console.log("TTS: STARTING TRACK");
    console.log("TTS: Lesson ID:", lessonId);
    console.log("TTS: Track index:", i);
    console.log("TTS: Module ID:", track.moduleId);
    console.log("TTS: Label:", track.label);
    console.log("TTS: Voice:", settings.voice);
    console.log("TTS: Style:", settings.style);
    console.log("TTS: Text length:", track.text.length);
    console.log("========================================");

    try {
      /*
       * Generate narration through the backend.
       */
      console.log("TTS: Sending API request...");

      const result = await audioApi.generate(lessonId, track.moduleId, {
        text: track.text,
        voice: settings.voice,
        style: settings.style,
      });

      console.log("TTS: API RESULT:", result);

      /*
       * Get the audio URL returned by the backend.
       */
      const { url } = result;

      console.log("TTS: AUDIO URL:", url);

      if (!url) {
        throw new Error("The narration API returned an empty audio URL.");
      }

      /*
       * Convert relative URLs to absolute URLs.
       *
       * This is important for production if the backend returns:
       *
       * /media/audio/...
       */
      const audioUrl = new URL(url, window.location.origin).toString();

      console.log("TTS: FINAL AUDIO URL:", audioUrl);

      /*
       * Stop previous audio before creating the new one.
       */
      if (audioRef.current) {
        console.log("TTS: Stopping previous audio");

        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
        audioRef.current = null;
      }

      /*
       * Create the audio element.
       */
      const audio = new Audio();

      audio.preload = "auto";
      audio.src = audioUrl;

      audioRef.current = audio;

      console.log("TTS: Audio element created");
      console.log("TTS: Audio source:", audio.src);

      /*
       * Audio events.
       */

      audio.onloadedmetadata = () => {
        console.log("TTS: Audio metadata loaded", {
          duration: audio.duration,
          readyState: audio.readyState,
        });
      };

      audio.oncanplay = () => {
        console.log("TTS: Audio can play");
      };

      audio.onplaying = () => {
        console.log("TTS: AUDIO PLAYING");

        setPlaying(true);
        setLoading(false);
      };

      audio.onpause = () => {
        console.log("TTS: AUDIO PAUSED");

        setPlaying(false);
      };

      audio.onended = () => {
        console.log("TTS: AUDIO ENDED");

        setPlaying(false);

        /*
         * Automatically play the next section.
         */
        if (i + 1 < tracks.length) {
          console.log("TTS: Starting next track:", i + 1);

          void loadAndPlay(i + 1);
        } else {
          console.log("TTS: Playlist finished");

          setIndex(null);
          setLoading(false);
        }
      };

      audio.onerror = () => {
        console.error("========================================");
        console.error("TTS: AUDIO ERROR");
        console.error("TTS: URL:", audio.src);
        console.error("TTS: Network state:", audio.networkState);
        console.error("TTS: Ready state:", audio.readyState);
        console.error("TTS: Error:", audio.error);
        console.error("========================================");

        setError(
          "The audio file could not be loaded. Please try again."
        );

        setPlaying(false);
        setLoading(false);
      };

      /*
       * Start loading the audio.
       */
      console.log("TTS: Loading audio...");

      audio.load();

      /*
       * Wait until enough audio is available.
       */
      try {
        await audio.play();

        console.log("TTS: PLAY SUCCESS");

        setPlaying(true);
      } catch (playError) {
        console.error("========================================");
        console.error("TTS: PLAYBACK ERROR");
        console.error("TTS: Error:", playError);
        console.error("TTS: Audio URL:", audio.src);
        console.error("========================================");

        /*
         * Browser autoplay/user-gesture protection.
         */
        if (
          playError instanceof DOMException &&
          playError.name === "NotAllowedError"
        ) {
          setError("Playback was blocked. Tap Play again.");
        } else if (
          playError instanceof DOMException &&
          playError.name === "NotSupportedError"
        ) {
          setError(
            "This browser cannot play the generated audio."
          );
        } else {
          setError(
            friendlyErrorMessage(
              playError,
              "Couldn't play this section."
            )
          );
        }

        setPlaying(false);
      }
    } catch (err) {
      console.error("========================================");
      console.error("TTS: FULL ERROR");
      console.error("TTS: Error:", err);
      console.error("========================================");

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

  /*
   * Main Play / Pause button.
   */
  const onPlayPause = async () => {
    console.log("TTS: PLAY/PAUSE CLICKED");

    /*
     * No current track:
     * Start from the first section.
     */
    if (index === null) {
      console.log("TTS: Starting playlist");

      setError(null);

      await loadAndPlay(0);

      return;
    }

    const audio = audioRef.current;

    if (!audio) {
      console.log(
        "TTS: Audio element missing. Reloading current track."
      );

      await loadAndPlay(index);

      return;
    }

    /*
     * Pause current audio.
     */
    if (!audio.paused) {
      console.log("TTS: Pausing audio");

      audio.pause();

      return;
    }

    /*
     * Resume current audio.
     */
    try {
      console.log("TTS: Resuming audio");

      await audio.play();

      console.log("TTS: RESUME SUCCESS");

      setPlaying(true);
      setError(null);
    } catch (playError) {
      console.error("TTS: RESUME ERROR:", playError);

      if (
        playError instanceof DOMException &&
        playError.name === "NotAllowedError"
      ) {
        setError("Playback was blocked. Tap Play again.");
      } else {
        setError(
          friendlyErrorMessage(
            playError,
            "Couldn't resume the audio."
          )
        );
      }

      setPlaying(false);
    }
  };

  /*
   * Current track.
   */
  const current = index !== null ? tracks[index] : null;

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
          onClick={() =>
            void loadAndPlay((index ?? 0) - 1)
          }
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
          onClick={() => void onPlayPause()}
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
          onClick={() =>
            void loadAndPlay((index ?? -1) + 1)
          }
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
            {index !== null ? index + 1 : 0} /{" "}
            {tracks.length} · {current.label}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-2 text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}