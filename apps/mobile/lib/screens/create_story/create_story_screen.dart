import 'package:flutter/material.dart';
import '../../api/ai_api.dart';
import '../../core/constants/app_constants.dart';
import '../../core/errors/api_exception.dart';
import '../../core/errors/error_messages.dart';
import '../../core/theme/app_theme.dart';
import '../lesson/lesson_screen.dart';

class CreateStoryScreen extends StatefulWidget {
  const CreateStoryScreen({super.key});

  @override
  State<CreateStoryScreen> createState() => _CreateStoryScreenState();
}

class _CreateStoryScreenState extends State<CreateStoryScreen> {
  final _aiApi = AiApi();
  final _passageController = TextEditingController();
  final _focusController = TextEditingController();

  String _ageGroup = AppConstants.ageGroups[1];
  String _styleId = AppConstants.illustrationStyles.first.id;
  bool _withIllustration = true;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _passageController.dispose();
    _focusController.dispose();
    super.dispose();
  }

  Future<void> _onGenerate() async {
    if (_passageController.text.trim().isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final style = AppConstants.illustrationStyles.firstWhere((s) => s.id == _styleId);
      final lesson = await _aiApi.generateLesson(
        passage: _passageController.text.trim(),
        ageGroup: _ageGroup,
        style: style.id,
        styleDescription: style.description,
        focus: _focusController.text.trim(),
        withIllustration: _withIllustration,
      );
      if (mounted) {
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => LessonScreen(lessonId: lesson.id)));
      }
    } on ApiException catch (e) {
      setState(() => _error = friendlyErrorMessage(e));
    } catch (_) {
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Custom story builder')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Type any Bible passage, choose how the artwork should look, and get a '
              'kid-friendly lesson with a memory verse, a game, an object lesson, and a '
              'matching illustration.',
              style: TextStyle(color: AppColors.mutedForeground),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _passageController,
              decoration: const InputDecoration(
                labelText: 'Bible passage',
                hintText: 'e.g. Jonah 1-3, or Luke 19:1-10',
              ),
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              value: _ageGroup,
              decoration: const InputDecoration(labelText: 'Age group'),
              items: AppConstants.ageGroups
                  .map((a) => DropdownMenuItem(value: a, child: Text(a)))
                  .toList(),
              onChanged: (v) => setState(() => _ageGroup = v ?? _ageGroup),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _focusController,
              decoration: const InputDecoration(
                labelText: 'Teaching focus (optional)',
                hintText: 'e.g. forgiveness, obeying the first time',
              ),
            ),
            const SizedBox(height: 18),
            const Text('Illustration style', style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: AppConstants.illustrationStyles.map((s) {
                final selected = s.id == _styleId;
                return ChoiceChip(
                  label: Text(s.id),
                  selected: selected,
                  onSelected: (_) => setState(() => _styleId = s.id),
                  selectedColor: AppColors.primary.withOpacity(0.15),
                  side: BorderSide(color: selected ? AppColors.primary : AppColors.border, width: 2),
                );
              }).toList(),
            ),
            const SizedBox(height: 14),
            SwitchListTile(
              value: _withIllustration,
              onChanged: (v) => setState(() => _withIllustration = v),
              title: const Text('Generate an illustration too'),
              contentPadding: EdgeInsets.zero,
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: AppColors.destructive, fontWeight: FontWeight.bold)),
            ],
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _loading ? null : _onGenerate,
              icon: _loading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.auto_fix_high),
              label: Text(_loading ? 'Writing the story…' : 'Generate sermon'),
            ),
            if (_loading) ...[
              const SizedBox(height: 10),
              const Text(
                'This can take up to a minute, especially with an illustration.',
                style: TextStyle(color: AppColors.mutedForeground, fontSize: 13),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
