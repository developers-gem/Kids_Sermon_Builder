class Activity {
  final String title;
  final int minutes;
  final String supplies;
  final List<String> steps;

  Activity({
    required this.title,
    required this.minutes,
    required this.supplies,
    required this.steps,
  });

  factory Activity.fromJson(Map<String, dynamic> json) => Activity(
        title: json['title'] as String? ?? '',
        minutes: (json['minutes'] as num?)?.toInt() ?? 0,
        supplies: json['supplies'] as String? ?? '',
        steps: (json['steps'] as List<dynamic>? ?? []).map((e) => e as String).toList(),
      );

  Map<String, dynamic> toJson() => {
        'title': title,
        'minutes': minutes,
        'supplies': supplies,
        'steps': steps,
      };
}

class MemoryVerse {
  final String text;
  final String reference;
  final List<String> motions;

  MemoryVerse({required this.text, required this.reference, required this.motions});

  factory MemoryVerse.fromJson(Map<String, dynamic> json) => MemoryVerse(
        text: json['text'] as String? ?? '',
        reference: json['reference'] as String? ?? '',
        motions: (json['motions'] as List<dynamic>? ?? []).map((e) => e as String).toList(),
      );

  Map<String, dynamic> toJson() => {'text': text, 'reference': reference, 'motions': motions};
}

class ColoringPage {
  final String image;
  final String alt;
  final String caption;

  ColoringPage({required this.image, required this.alt, required this.caption});

  factory ColoringPage.fromJson(Map<String, dynamic> json) => ColoringPage(
        image: json['image'] as String? ?? '',
        alt: json['alt'] as String? ?? '',
        caption: json['caption'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {'image': image, 'alt': alt, 'caption': caption};
}

class Illustration {
  final String url;
  final String prompt;

  Illustration({required this.url, required this.prompt});

  factory Illustration.fromJson(Map<String, dynamic> json) => Illustration(
        url: json['url'] as String? ?? '',
        prompt: json['prompt'] as String? ?? '',
      );
}
