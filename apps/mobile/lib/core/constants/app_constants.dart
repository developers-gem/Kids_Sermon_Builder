/// Mirrors packages/constants/src/index.ts. Dart can't share code directly
/// with the TypeScript packages, so these values are kept in sync by hand —
/// if the web app's constants change, update this file to match.
class AppConstants {
  AppConstants._();

  static const List<String> ageGroups = [
    'Ages 3-5',
    'Ages 6-8',
    'Ages 9-12',
    'Mixed ages 3-12',
  ];

  static const List<IllustrationStyle> illustrationStyles = [
    IllustrationStyle(
      id: 'paper-cut-collage',
      description: 'Layered construction-paper shapes, warm background, soft craft textures',
    ),
    IllustrationStyle(
      id: 'watercolor-storybook',
      description: 'Soft washes, gentle edges, dreamy pastel palette like a bedtime picture book',
    ),
    IllustrationStyle(
      id: 'bold-cartoon',
      description: 'Thick outlines, bright flat colors, playful expressive characters',
    ),
    IllustrationStyle(
      id: 'felt-board',
      description: 'Classic Sunday-school flannelgraph look with fuzzy felt cut-out figures',
    ),
    IllustrationStyle(
      id: 'stained-glass',
      description: 'Jewel-tone glass panels with dark leading lines and glowing light',
    ),
    IllustrationStyle(
      id: 'crayon-doodle',
      description: 'Looks hand-drawn by a child with waxy crayon texture on paper',
    ),
  ];

  static const List<NarrationVoice> narrationVoices = [
    NarrationVoice(id: 'nova', name: 'Nova', blurb: 'Warm and gentle'),
    NarrationVoice(id: 'alloy', name: 'Alloy', blurb: 'Clear and neutral'),
    NarrationVoice(id: 'shimmer', name: 'Shimmer', blurb: 'Bright and lively'),
    NarrationVoice(id: 'fable', name: 'Fable', blurb: 'Storyteller warmth'),
    NarrationVoice(id: 'echo', name: 'Echo', blurb: 'Calm and steady'),
    NarrationVoice(id: 'onyx', name: 'Onyx', blurb: 'Deep and grounded'),
  ];

  static const List<NarrationStyle> narrationStyles = [
    NarrationStyle(id: 'kid-friendly', name: 'Kid-friendly', blurb: 'Bubbly, simple, lots of energy'),
    NarrationStyle(id: 'storyteller', name: 'Storyteller', blurb: 'Warm, paced, a little dramatic'),
    NarrationStyle(id: 'teacher', name: 'Teacher', blurb: 'Clear, steady, classroom-ready'),
  ];

  static const defaultVoice = 'nova';
  static const defaultNarrationStyle = 'kid-friendly';

  /// Order matters here — it's the default run-sheet order shown on the
  /// Builder-equivalent screen, matching LESSON_MODULES in the web app.
  static const List<LessonModuleMeta> lessonModules = [
    LessonModuleMeta(id: 'story', label: 'Bible story + visual', minutes: 6),
    LessonModuleMeta(id: 'verse', label: 'Memory verse with motions', minutes: 4),
    LessonModuleMeta(id: 'games', label: 'Games & activities', minutes: 12),
    LessonModuleMeta(id: 'object', label: 'Object lesson', minutes: 5),
    LessonModuleMeta(id: 'coloring', label: 'Coloring page', minutes: 5),
    LessonModuleMeta(id: 'prayer', label: 'Closing prayer', minutes: 2),
  ];
}

class IllustrationStyle {
  final String id;
  final String description;
  const IllustrationStyle({required this.id, required this.description});
}

class NarrationVoice {
  final String id;
  final String name;
  final String blurb;
  const NarrationVoice({required this.id, required this.name, required this.blurb});
}

class NarrationStyle {
  final String id;
  final String name;
  final String blurb;
  const NarrationStyle({required this.id, required this.name, required this.blurb});
}

class LessonModuleMeta {
  final String id;
  final String label;
  final int minutes;
  const LessonModuleMeta({required this.id, required this.label, required this.minutes});
}
