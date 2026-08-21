import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/theme/app_theme.dart';
import '../models/lesson.dart';
import 'lesson_panel.dart';
import 'lesson_audio_playlist.dart';
import 'narration_player.dart';

/// Renders every active module of a lesson, in the lesson's own module
/// order — read-only content rendering; editing/reordering controls are
/// added around this by the screen that embeds it (mirrors how
/// apps/web/src/pages/LessonDetailPage.tsx separates the toolbar from the
/// module-by-module render loop).
class LessonContent extends StatelessWidget {
  final Lesson lesson;

  const LessonContent({super.key, required this.lesson});

  List<PlaylistTrack> _buildPlaylistTracks() {
    final tracks = <PlaylistTrack>[];
    for (final moduleId in lesson.activeModules) {
      switch (moduleId) {
        case 'story':
          tracks.add(PlaylistTrack(
            moduleId: 'story',
            label: 'Story',
            text: [lesson.title, lesson.bigIdea, ...lesson.story].join(' '),
          ));
          break;
        case 'verse':
          tracks.add(PlaylistTrack(
            moduleId: 'verse',
            label: 'Memory verse',
            text: '${lesson.memoryVerse.text} — ${lesson.memoryVerse.reference}',
          ));
          break;
        case 'games':
          if (lesson.games.isNotEmpty) {
            tracks.add(PlaylistTrack(
              moduleId: 'games',
              label: 'Games & activities',
              text: lesson.games
                  .map((g) => '${g.title}. Supplies: ${g.supplies}. ${g.steps.join(" ")}')
                  .join(' Next game. '),
            ));
          }
          break;
        case 'object':
          tracks.add(PlaylistTrack(
            moduleId: 'object',
            label: 'Object lesson',
            text:
                '${lesson.objectLesson.title}. Supplies: ${lesson.objectLesson.supplies}. ${lesson.objectLesson.steps.join(" ")}',
          ));
          break;
        case 'prayer':
          tracks.add(PlaylistTrack(moduleId: 'prayer', label: 'Closing prayer', text: lesson.prayer));
          break;
        // "coloring" has no spoken content — a caption isn't narration.
      }
    }
    return tracks;
  }

  @override
  Widget build(BuildContext context) {
    final playlistTracks = _buildPlaylistTracks();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Header(lesson: lesson),
        const SizedBox(height: 16),
        if (playlistTracks.length > 1) ...[
          LessonAudioPlaylist(lessonId: lesson.id, tracks: playlistTracks),
          const SizedBox(height: 16),
        ],
        for (final moduleId in lesson.activeModules) ...[
          _buildModule(moduleId, lesson),
          const SizedBox(height: 16),
        ],
      ],
    );
  }

  Widget _buildModule(String moduleId, Lesson lesson) {
    switch (moduleId) {
      case 'story':
        return LessonPanel(
          icon: Icons.menu_book,
          title: 'Tell the story',
          tint: PanelTint.primary,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var i = 0; i < lesson.story.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        margin: const EdgeInsets.only(right: 10, top: 2),
                        decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                        child: Center(
                          child: Text(
                            '${i + 1}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                      Expanded(child: Text(lesson.story[i], style: const TextStyle(fontSize: 15, height: 1.4))),
                    ],
                  ),
                ),
              NarrationPlayer(
                lessonId: lesson.id,
                moduleId: 'story',
                label: 'Story narration',
                text: ([lesson.title, lesson.bigIdea, ...lesson.story]).join(' '),
              ),
              if (lesson.askThem.isNotEmpty) ...[
                const SizedBox(height: 14),
                const Text('Ask them', style: TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                for (final q in lesson.askThem)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text('•  $q', style: const TextStyle(color: AppColors.mutedForeground)),
                  ),
              ],
            ],
          ),
        );

      case 'verse':
        return LessonPanel(
          icon: Icons.auto_awesome,
          title: 'Memory verse',
          tint: PanelTint.accent,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.secondary,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  children: [
                    Text(
                      '"${lesson.memoryVerse.text}"',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, height: 1.3),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      lesson.memoryVerse.reference,
                      style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.mutedForeground),
                    ),
                  ],
                ),
              ),
              NarrationPlayer(
                lessonId: lesson.id,
                moduleId: 'verse',
                label: 'Memory verse',
                text: '${lesson.memoryVerse.text} — ${lesson.memoryVerse.reference}',
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final m in lesson.memoryVerse.motions)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.border, width: 2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(m, style: const TextStyle(fontSize: 13)),
                    ),
                ],
              ),
            ],
          ),
        );

      case 'games':
        if (lesson.games.isEmpty) return const SizedBox.shrink();
        return LessonPanel(
          icon: Icons.sports_esports,
          title: 'Games & activities',
          tint: PanelTint.leaf,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final g in lesson.games)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: ActivityCard(
                    title: g.title,
                    minutes: g.minutes,
                    supplies: g.supplies,
                    steps: g.steps,
                  ),
                ),
              NarrationPlayer(
                lessonId: lesson.id,
                moduleId: 'games',
                label: 'Games & activities',
                text: lesson.games
                    .map((g) => '${g.title}. Supplies: ${g.supplies}. ${g.steps.join(" ")}')
                    .join(' Next game. '),
              ),
            ],
          ),
        );

      case 'object':
        return LessonPanel(
          icon: Icons.lightbulb,
          title: 'Object lesson',
          tint: PanelTint.berry,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ActivityCard(
                title: lesson.objectLesson.title,
                minutes: lesson.objectLesson.minutes,
                supplies: lesson.objectLesson.supplies,
                steps: lesson.objectLesson.steps,
              ),
              NarrationPlayer(
                lessonId: lesson.id,
                moduleId: 'object',
                label: 'Object lesson',
                text:
                    '${lesson.objectLesson.title}. Supplies: ${lesson.objectLesson.supplies}. ${lesson.objectLesson.steps.join(" ")}',
              ),
            ],
          ),
        );

      case 'coloring':
        if (lesson.coloringPage == null) return const SizedBox.shrink();
        final cp = lesson.coloringPage!;
        return LessonPanel(
          icon: Icons.palette,
          title: 'Coloring page',
          tint: PanelTint.primary,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: CachedNetworkImage(
                  imageUrl: cp.image,
                  fit: BoxFit.cover,
                  errorWidget: (_, __, ___) => Container(
                    height: 160,
                    color: AppColors.muted,
                    child: const Center(child: Icon(Icons.image_not_supported)),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Text(cp.caption, style: const TextStyle(fontWeight: FontWeight.w700)),
            ],
          ),
        );

      case 'prayer':
        return LessonPanel(
          icon: Icons.favorite,
          title: 'Closing prayer',
          tint: PanelTint.accent,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                lesson.prayer,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, height: 1.4),
              ),
              NarrationPlayer(
                lessonId: lesson.id,
                moduleId: 'prayer',
                label: 'Closing prayer',
                text: lesson.prayer,
              ),
            ],
          ),
        );

      default:
        return const SizedBox.shrink();
    }
  }
}

class _Header extends StatelessWidget {
  final Lesson lesson;
  const _Header({required this.lesson});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (lesson.illustration != null)
            CachedNetworkImage(
              imageUrl: lesson.illustration!.url,
              height: 200,
              width: double.infinity,
              fit: BoxFit.cover,
              errorWidget: (_, __, ___) => Container(height: 200, color: AppColors.muted),
            ),
          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${lesson.bibleReference} · ${lesson.ageGroup}'.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(lesson.title, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                Text(
                  'Big idea: ${lesson.bigIdea}',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.accent),
                ),
                if (lesson.reviewRequired) ...[
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.accent.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.accent.withOpacity(0.4), width: 2),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'AI-generated content should be reviewed for Scripture accuracy before teaching.',
                          style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.accent),
                        ),
                        if (lesson.validationWarnings.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          for (final w in lesson.validationWarnings)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text('•  $w', style: const TextStyle(fontSize: 13, color: AppColors.accent)),
                            ),
                        ],
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
