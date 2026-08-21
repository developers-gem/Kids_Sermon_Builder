import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../api/stories_api.dart';
import '../../api/lessons_api.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../models/story.dart';
import '../../core/errors/error_messages.dart';
import '../lesson/lesson_screen.dart';

class LibraryScreen extends StatefulWidget {
  const LibraryScreen({super.key});

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  final _storiesApi = StoriesApi();
  final _lessonsApi = LessonsApi();

  List<Story> _stories = [];
  bool _loading = true;
  String? _error;
  String? _openingStoryId;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load({String? search}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final stories = await _storiesApi.list(search: search);
      if (mounted) setState(() => _stories = stories);
    } catch (e) {
      if (mounted) {
        setState(() => _error = friendlyErrorMessage(e, "Couldn't load stories. Is the backend running?"));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openStory(Story story) async {
    setState(() => _openingStoryId = story.id);
    try {
      final defaultModules = AppConstants.lessonModules.map((m) => m.id).toList();
      final lesson = await _lessonsApi.createFromStory(story.id, defaultModules);
      if (mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => LessonScreen(lessonId: lesson.id)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyErrorMessage(e, "Couldn't open this story. Please try again."))),
        );
      }
    } finally {
      if (mounted) setState(() => _openingStoryId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Story library'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search stories…',
                prefixIcon: const Icon(Icons.search, size: 20),
                isDense: true,
              ),
              onSubmitted: (v) => _load(search: v),
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text(_error!))
                : RefreshIndicator(
                    onRefresh: () => _load(search: _searchController.text),
                    child: ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _stories.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, i) {
                        final s = _stories[i];
                        final isOpening = _openingStoryId == s.id;
                        return Card(
                          clipBehavior: Clip.antiAlias,
                          child: InkWell(
                            onTap: isOpening ? null : () => _openStory(s),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CachedNetworkImage(
                                  imageUrl: s.image,
                                  height: 140,
                                  width: double.infinity,
                                  fit: BoxFit.cover,
                                  errorWidget: (_, __, ___) => Container(height: 140, color: AppColors.muted),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              s.title,
                                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                                            ),
                                          ),
                                          if (isOpening)
                                            const SizedBox(
                                              width: 16,
                                              height: 16,
                                              child: CircularProgressIndicator(strokeWidth: 2),
                                            ),
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        s.reference,
                                        style: const TextStyle(color: AppColors.mutedForeground),
                                      ),
                                      const SizedBox(height: 8),
                                      Wrap(
                                        spacing: 6,
                                        children: [
                                          _Tag(text: s.theme, color: AppColors.accent),
                                          _Tag(text: s.ageRange, color: AppColors.mutedForeground),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String text;
  final Color color;
  const _Tag({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(text, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color)),
    );
  }
}
