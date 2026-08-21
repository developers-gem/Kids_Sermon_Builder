import { Settings2 } from "lucide-react";
import { NARRATION_STYLES, NARRATION_VOICES, useNarrationSettings } from "@/lib/narration";
import type { NarrationStyleId } from "@ksb/types";

export function NarrationSettingsPanel() {
  const { settings, update } = useNarrationSettings();

  return (
    <section className="no-print rounded-2xl border-2 border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-accent" />
        <h3 className="font-display text-lg font-bold">Narration voice &amp; style</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Applies to every &ldquo;Listen&rdquo; button for the story and memory verse.
      </p>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="narration-voice"
            className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
          >
            Voice
          </label>
          <select
            id="narration-voice"
            value={settings.voice}
            onChange={(e) => update({ voice: e.target.value as typeof settings.voice })}
            className="mt-2 w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm font-bold"
          >
            {NARRATION_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.blurb}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Narration style
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {NARRATION_STYLES.map((s) => {
              const active = settings.style === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => update({ style: s.id as NarrationStyleId })}
                  aria-pressed={active}
                  title={s.blurb}
                  className={`rounded-full border-2 px-3 py-2 text-sm font-bold transition-colors ${
                    active
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-background hover:border-accent"
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {NARRATION_STYLES.find((s) => s.id === settings.style)?.blurb}
          </p>
        </div>
      </div>
    </section>
  );
}
