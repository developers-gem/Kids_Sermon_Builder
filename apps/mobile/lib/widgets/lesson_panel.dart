import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';

enum PanelTint { primary, accent, leaf, berry }

Color _tintColor(PanelTint tint) {
  switch (tint) {
    case PanelTint.primary:
      return AppColors.primary;
    case PanelTint.accent:
      return AppColors.accent;
    case PanelTint.leaf:
      return AppColors.leaf;
    case PanelTint.berry:
      return AppColors.berry;
  }
}

class LessonPanel extends StatelessWidget {
  final IconData icon;
  final String title;
  final PanelTint tint;
  final Widget child;
  final Widget? trailing;

  const LessonPanel({
    super.key,
    required this.icon,
    required this.title,
    required this.tint,
    required this.child,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: _tintColor(tint),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                ),
                if (trailing != null) trailing!,
              ],
            ),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );
  }
}

class ActivityCard extends StatelessWidget {
  final String title;
  final int minutes;
  final String supplies;
  final List<String> steps;

  const ActivityCard({
    super.key,
    required this.title,
    required this.minutes,
    required this.supplies,
    required this.steps,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.muted,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
              ),
              Text(
                '$minutes min',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.mutedForeground),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text('Supplies: $supplies', style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
          const SizedBox(height: 8),
          ...steps.asMap().entries.map(
                (e) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text('${e.key + 1}. ${e.value}', style: const TextStyle(fontSize: 14)),
                ),
              ),
        ],
      ),
    );
  }
}
