import type { LessonModuleId, NarrationStyleId, NarrationVoiceId } from "@ksb/types";

/**
 * Preserved verbatim from the original prototype (src/routes/create.tsx) so the
 * Custom Story Builder behaves identically after migration.
 */
export const ILLUSTRATION_STYLES = [
  {
    id: "Paper-cut collage",
    description: "Layered construction-paper shapes, warm cream background, soft craft textures",
  },
  {
    id: "Watercolor storybook",
    description: "Soft washes, gentle edges, dreamy pastel palette like a bedtime picture book",
  },
  {
    id: "Bold cartoon",
    description: "Thick outlines, bright flat colors, playful expressive characters",
  },
  {
    id: "Felt board",
    description: "Classic Sunday-school flannelgraph look with fuzzy felt cut-out figures",
  },
  {
    id: "Stained glass",
    description: "Jewel-tone glass panels with dark leading lines and glowing light",
  },
  {
    id: "Crayon doodle",
    description: "Looks hand-drawn by a child with waxy crayon texture on paper",
  },
] as const;

export const AGE_GROUPS = ["Ages 3–5", "Ages 6–8", "Ages 9–12", "Mixed ages 3–12"] as const;

export const NARRATION_VOICES: { id: NarrationVoiceId; name: string; blurb: string }[] = [
  { id: "alloy", name: "Alloy", blurb: "Balanced and friendly" },
  { id: "shimmer", name: "Shimmer", blurb: "Bright and cheerful" },
  { id: "nova", name: "Nova", blurb: "Warm and gentle" },
  { id: "fable", name: "Fable", blurb: "Playful storybook" },
  { id: "echo", name: "Echo", blurb: "Calm and steady" },
  { id: "onyx", name: "Onyx", blurb: "Deep and grounded" },
];

export const NARRATION_STYLES: {
  id: NarrationStyleId;
  name: string;
  blurb: string;
  instructions: string;
}[] = [
  {
    id: "kid-friendly",
    name: "Kid-friendly",
    blurb: "Bubbly, simple, lots of energy",
    instructions:
      "Speak like a joyful children's ministry leader talking to 4-8 year olds: bubbly, simple, upbeat, with clear short phrases and plenty of smiling warmth.",
  },
  {
    id: "storyteller",
    name: "Storyteller",
    blurb: "Dramatic campfire pacing",
    instructions:
      "Narrate like a captivating storyteller around a campfire: expressive, slower dramatic pacing, meaningful pauses, and gentle suspense that keeps children leaning in.",
  },
  {
    id: "teacher",
    name: "Teacher",
    blurb: "Clear, calm, instructional",
    instructions:
      "Read like a patient classroom teacher: clear articulation, calm measured pace, emphasis on key words so children can follow and repeat along.",
  },
];

export const DEFAULT_NARRATION = { voice: "nova" as NarrationVoiceId, style: "kid-friendly" as NarrationStyleId };

/** Builder module metadata: id, label, icon name (lucide-react), default minutes. */
export const LESSON_MODULES: {
  id: LessonModuleId;
  label: string;
  icon: string;
  minutes: number;
}[] = [
  { id: "story", label: "Bible story + visual", icon: "BookOpen", minutes: 6 },
  { id: "verse", label: "Memory verse with motions", icon: "Sparkles", minutes: 5 },
  { id: "games", label: "Games & activities", icon: "Gamepad2", minutes: 10 },
  { id: "object", label: "Object lesson", icon: "Lightbulb", minutes: 5 },
  { id: "coloring", label: "Coloring page", icon: "Palette", minutes: 8 },
  { id: "prayer", label: "Closing prayer", icon: "Heart", minutes: 2 },
];
