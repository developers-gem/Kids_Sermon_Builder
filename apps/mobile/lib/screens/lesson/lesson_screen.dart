import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../api/lessons_api.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/file_download.dart';
import '../../core/errors/error_messages.dart';
import '../../models/lesson.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/lesson_content.dart';

class LessonScreen extends StatefulWidget {
  final String lessonId;
  const LessonScreen({super.key, required this.lessonId});

  @override
  State<LessonScreen> createState() => _LessonScreenState();
}

class _LessonScreenState extends State<LessonScreen> {
  final _lessonsApi = LessonsApi();

  Lesson? _lesson;
  bool _loading = true;
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final lesson = await _lessonsApi.getById(widget.lessonId);
      if (mounted) setState(() => _lesson = lesson);
    } catch (e) {
      if (mounted) setState(() => _error = friendlyErrorMessage(e, "Couldn't load this lesson."));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool get _isOwner {
    final user = context.read<AuthProvider>().user;
    final lesson = _lesson;
    return user != null && lesson != null && lesson.ownerId == user.id;
  }

  Future<void> _withBusy(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _toggleFavorite() => _withBusy(() async {
        final lesson = _lesson!;
        if (lesson.isFavorite == true) {
          await _lessonsApi.unfavorite(lesson.id);
        } else {
          await _lessonsApi.favorite(lesson.id);
        }
        await _load();
      });

  Future<void> _toggleArchive() => _withBusy(() async {
        final lesson = _lesson!;
        if (lesson.isArchived == true) {
          await _lessonsApi.unarchive(lesson.id);
        } else {
          await _lessonsApi.archive(lesson.id);
        }
        await _load();
      });

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete "${_lesson!.title}"?'),
        content: const Text("This can't be undone."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: AppColors.destructive)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await _withBusy(() async {
      await _lessonsApi.remove(_lesson!.id);
      if (mounted) Navigator.of(context).pop();
    });
  }

  Future<void> _duplicate() => _withBusy(() async {
        final copy = await _lessonsApi.duplicate(_lesson!.id);
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => LessonScreen(lessonId: copy.id)),
          );
        }
      });

  Future<void> _share() => _withBusy(() async {
        final token = await _lessonsApi.createShareLink(_lesson!.id);
        final link = 'https://kidssermonbuilder.app/shared/$token';
        // The web app's own domain isn't known to this mobile build (no
        // shared config between apps for it), so this shares the token
        // path — if you're wiring this to a real deployment, swap in the
        // actual web app origin here.
        await Share.share(link, subject: _lesson!.title);
      });

  Future<void> _downloadPdf() => _withBusy(() async {
        final bytes = await _lessonsApi.downloadPdf(_lesson!.id);
        await saveAndShareBytes(bytes, '${_lesson!.title.toLowerCase().replaceAll(RegExp(r"\s+"), "-")}.pdf');
      });

  Future<void> _generateColoringPage() => _withBusy(() async {
        await _lessonsApi.generateColoringPage(_lesson!.id);
        await _load();
      });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_lesson?.title ?? 'Lesson')),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null || _lesson == null
                ? Center(child: Text(_error ?? 'Not found'))
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            if (_isOwner) ...[
                              _ActionChip(
                                icon: _lesson!.isFavorite == true ? Icons.star : Icons.favorite_border,
                                label: _lesson!.isFavorite == true ? 'Favorited' : 'Favorite',
                                onTap: _busy ? null : _toggleFavorite,
                              ),
                              _ActionChip(
                                icon: _lesson!.isArchived == true ? Icons.unarchive : Icons.archive_outlined,
                                label: _lesson!.isArchived == true ? 'Restore' : 'Archive',
                                onTap: _busy ? null : _toggleArchive,
                              ),
                              _ActionChip(icon: Icons.copy, label: 'Duplicate', onTap: _busy ? null : _duplicate),
                              _ActionChip(icon: Icons.share, label: 'Share', onTap: _busy ? null : _share),
                              if (_lesson!.moduleActive('coloring'))
                                _ActionChip(
                                  icon: Icons.auto_fix_high,
                                  label: _lesson!.coloringPage != null ? 'New coloring page' : 'Generate coloring page',
                                  onTap: _busy ? null : _generateColoringPage,
                                ),
                            ],
                            _ActionChip(
                              icon: Icons.picture_as_pdf,
                              label: 'Download PDF',
                              onTap: _busy ? null : _downloadPdf,
                              filled: true,
                            ),
                            if (_isOwner)
                              _ActionChip(
                                icon: Icons.delete_outline,
                                label: 'Delete',
                                onTap: _busy ? null : _delete,
                                destructive: true,
                              ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        LessonContent(lesson: _lesson!),
                      ],
                    ),
                  ),
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final bool filled;
  final bool destructive;

  const _ActionChip({
    required this.icon,
    required this.label,
    required this.onTap,
    this.filled = false,
    this.destructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = destructive ? AppColors.destructive : (filled ? AppColors.berryForeground : AppColors.foreground);
    return ActionChip(
      avatar: Icon(icon, size: 16, color: color),
      label: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700)),
      backgroundColor: filled ? AppColors.berry : AppColors.card,
      side: BorderSide(color: destructive ? AppColors.destructive.withOpacity(0.4) : AppColors.border, width: 2),
      onPressed: onTap,
    );
  }
}
