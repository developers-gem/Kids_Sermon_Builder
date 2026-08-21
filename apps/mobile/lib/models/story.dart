import 'shared.dart';

class Story {
  final String id;
  final String slug;
  final String title;
  final String reference;
  final String theme;
  final String ageRange;
  final String image;
  final String imageAlt;
  final String bigIdea;
  final List<String> tellIt;
  final List<String> askThem;
  final MemoryVerse memoryVerse;
  final List<Activity> games;
  final Activity objectLesson;
  final ColoringPage coloringPage;
  final String prayer;
  final String status;
  final bool featured;

  Story({
    required this.id,
    required this.slug,
    required this.title,
    required this.reference,
    required this.theme,
    required this.ageRange,
    required this.image,
    required this.imageAlt,
    required this.bigIdea,
    required this.tellIt,
    required this.askThem,
    required this.memoryVerse,
    required this.games,
    required this.objectLesson,
    required this.coloringPage,
    required this.prayer,
    required this.status,
    required this.featured,
  });

  factory Story.fromJson(Map<String, dynamic> json) => Story(
        id: json['id'] as String? ?? json['_id'] as String? ?? '',
        slug: json['slug'] as String? ?? '',
        title: json['title'] as String? ?? '',
        reference: json['reference'] as String? ?? '',
        theme: json['theme'] as String? ?? '',
        ageRange: json['ageRange'] as String? ?? '',
        image: json['image'] as String? ?? '',
        imageAlt: json['imageAlt'] as String? ?? '',
        bigIdea: json['bigIdea'] as String? ?? '',
        tellIt: (json['tellIt'] as List<dynamic>? ?? []).map((e) => e as String).toList(),
        askThem: (json['askThem'] as List<dynamic>? ?? []).map((e) => e as String).toList(),
        memoryVerse: MemoryVerse.fromJson(json['memoryVerse'] as Map<String, dynamic>? ?? {}),
        games: (json['games'] as List<dynamic>? ?? [])
            .map((e) => Activity.fromJson(e as Map<String, dynamic>))
            .toList(),
        objectLesson: Activity.fromJson(json['objectLesson'] as Map<String, dynamic>? ?? {}),
        coloringPage: ColoringPage.fromJson(json['coloringPage'] as Map<String, dynamic>? ?? {}),
        prayer: json['prayer'] as String? ?? '',
        status: json['status'] as String? ?? 'published',
        featured: json['featured'] as bool? ?? false,
      );
}
