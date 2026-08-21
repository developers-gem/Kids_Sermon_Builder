import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../api/lessons_api.dart';
import '../../core/theme/app_theme.dart';
import '../../models/lesson.dart';
import '../../providers/auth_provider.dart';
import '../../core/errors/error_messages.dart';
import '../auth/login_screen.dart';
import '../lesson/lesson_screen.dart';

class MyLessonsScreen extends StatefulWidget {
  const MyLessonsScreen({super.key});

  @override
  State<MyLessonsScreen> createState() => _MyLessonsScreenState();
}

class _MyLessonsScreenState extends State<MyLessonsScreen> with SingleTickerProviderStateMixin {
  final _lessonsApi = LessonsApi();
  late final TabController _tabController;

  List<Lesson> _lessons = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this)..addListener(_onTabChanged);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final favorite = _tabController.index == 1 ? true : null;
      final archived = _tabController.index == 2 ? true : null;
      final lessons = await _lessonsApi.list(favorite: favorite, archived: archived);
      if (mounted) setState(() => _lessons = lessons);
    } catch (e) {
      if (mounted) setState(() => _error = friendlyErrorMessage(e, "Couldn't load your lessons."));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (auth.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('My lessons')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Log in to save lessons and see your library.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                  ),
                  child: const Text('Log in'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('My lessons'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [Tab(text: 'All'), Tab(text: 'Favorites'), Tab(text: 'Archived')],
        ),
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text(_error!))
                : _lessons.isEmpty
                    ? const Center(child: Text('Nothing here yet.'))
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _lessons.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, i) {
                            final lesson = _lessons[i];
                            return Card(
                              child: ListTile(
                                title: Text(lesson.title, style: const TextStyle(fontWeight: FontWeight.w800)),
                                subtitle: Text('${lesson.bibleReference} · ${lesson.ageGroup} · ${lesson.durationMinutes} min'),
                                trailing: lesson.reviewRequired
                                    ? const Icon(Icons.rate_review_outlined, color: AppColors.accent, size: 20)
                                    : null,
                                onTap: () async {
                                  await Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => LessonScreen(lessonId: lesson.id)),
                                  );
                                  _load();
                                },
                              ),
                            );
                          },
                        ),
                      ),
      ),
    );
  }
}
