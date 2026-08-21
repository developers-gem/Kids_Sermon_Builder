import 'shared.dart';

class Lesson {
  final String id;
  final String? ownerId;
  final String source; // "story" | "custom"
  final String? storyId;
  final String title;
  final String bibleReference;
  final String ageGroup;
  final String theme;
  final String bigIdea;
  final List<String> story;
  final List<String> askThem;
  final MemoryVerse memoryVerse;
  final List<Activity> games;
  final Activity objectLesson;
  final ColoringPage? coloringPage;
  final String prayer;
  final Illustration? illustration;
  final String? illustrationStyle;
  final List<String> activeModules;
  final int durationMinutes;
  final String status;
  final String visibility;
  final String contentStatus;
  final bool reviewRequired;
  final List<String> validationWarnings;
  // Nullable: stripped from the response for anyone viewing a lesson they
  // don't own (see server/src/utils/lessonView.ts toPublicLessonView).
  final bool? isFavorite;
  final bool? isArchived;
  final String createdAt;
  final String updatedAt;

  Lesson({
    required this.id,
    this.ownerId,
    required this.source,
    this.storyId,
    required this.title,
    required this.bibleReference,
    required this.ageGroup,
    required this.theme,
    required this.bigIdea,
    required this.story,
    required this.askThem,
    required this.memoryVerse,
    required this.games,
    required this.objectLesson,
    this.coloringPage,
    required this.prayer,
    this.illustration,
    this.illustrationStyle,
    required this.activeModules,
    required this.durationMinutes,
    required this.status,
    required this.visibility,
    required this.contentStatus,
    required this.reviewRequired,
    required this.validationWarnings,
    this.isFavorite,
    this.isArchived,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Lesson.fromJson(Map<String, dynamic> json) => Lesson(
        id: json['id'] as String? ?? json['_id'] as String? ?? '',
        ownerId: json['ownerId'] as String?,
        source: json['source'] as String? ?? 'story',
        storyId: json['storyId'] as String?,
        title: json['title'] as String? ?? '',
        bibleReference: json['bibleReference'] as String? ?? '',
        ageGroup: json['ageGroup'] as String? ?? '',
        theme: json['theme'] as String? ?? '',
        bigIdea: json['bigIdea'] as String? ?? '',
        story: (json['story'] as List<dynamic>? ?? []).map((e) => e as String).toList(),
        askThem: (json['askThem'] as List<dynamic>? ?? []).map((e) => e as String).toList(),
        memoryVerse: MemoryVerse.fromJson(json['memoryVerse'] as Map<String, dynamic>? ?? {}),
        games: (json['games'] as List<dynamic>? ?? [])
            .map((e) => Activity.fromJson(e as Map<String, dynamic>))
            .toList(),
        objectLesson: Activity.fromJson(json['objectLesson'] as Map<String, dynamic>? ?? {}),
        coloringPage: json['coloringPage'] != null
            ? ColoringPage.fromJson(json['coloringPage'] as Map<String, dynamic>)
            : null,
        prayer: json['prayer'] as String? ?? '',
        illustration: json['illustration'] != null
            ? Illustration.fromJson(json['illustration'] as Map<String, dynamic>)
            : null,
        illustrationStyle: json['illustrationStyle'] as String?,
        activeModules:
            (json['activeModules'] as List<dynamic>? ?? []).map((e) => e as String).toList(),
        durationMinutes: (json['durationMinutes'] as num?)?.toInt() ?? 0,
        status: json['status'] as String? ?? 'ready',
        visibility: json['visibility'] as String? ?? 'private',
        contentStatus: json['contentStatus'] as String? ?? 'ok',
        reviewRequired: json['reviewRequired'] as bool? ?? false,
        validationWarnings:
            (json['validationWarnings'] as List<dynamic>? ?? []).map((e) => e as String).toList(),
        isFavorite: json['isFavorite'] as bool?,
        isArchived: json['isArchived'] as bool?,
        createdAt: json['createdAt'] as String? ?? '',
        updatedAt: json['updatedAt'] as String? ?? '',
      );

  bool get hasModule => activeModules.isNotEmpty;
  bool moduleActive(String moduleId) => activeModules.contains(moduleId);
}
