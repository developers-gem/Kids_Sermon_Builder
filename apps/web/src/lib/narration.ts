import { useEffect, useState } from "react";
import { NARRATION_VOICES, NARRATION_STYLES, DEFAULT_NARRATION } from "@ksb/constants";
import type { NarrationSettings } from "@ksb/types";

export { NARRATION_VOICES, NARRATION_STYLES };

const KEY = "sermon-builder:narration";
const EVENT = "narration-settings-change";

function read(): NarrationSettings {
  if (typeof window === "undefined") return DEFAULT_NARRATION;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_NARRATION;
    const parsed = JSON.parse(raw) as Partial<NarrationSettings>;
    return {
      voice: NARRATION_VOICES.some((v) => v.id === parsed.voice)
        ? (parsed.voice as NarrationSettings["voice"])
        : DEFAULT_NARRATION.voice,
      style: NARRATION_STYLES.some((s) => s.id === parsed.style)
        ? (parsed.style as NarrationSettings["style"])
        : DEFAULT_NARRATION.style,
    };
  } catch {
    return DEFAULT_NARRATION;
  }
}

export function useNarrationSettings() {
  const [settings, setSettings] = useState<NarrationSettings>(DEFAULT_NARRATION);

  useEffect(() => {
    setSettings(read());
    const sync = () => setSettings(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = (patch: Partial<NarrationSettings>) => {
    const next = { ...read(), ...patch };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
    setSettings(next);
    window.dispatchEvent(new Event(EVENT));
  };

  return { settings, update };
}
