import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:provider/provider.dart';
import '../api/audio_api.dart';
import '../core/theme/app_theme.dart';
import '../providers/narration_settings_provider.dart';

String _formatDuration(Duration d) {
  final minutes = d.inMinutes;
  final seconds = d.inSeconds % 60;
  return '$minutes:${seconds.toString().padLeft(2, '0')}';
}

class NarrationPlayer extends StatefulWidget {
  final String lessonId;
  final String moduleId;
  final String label;
  final String text;

  const NarrationPlayer({
    super.key,
    required this.lessonId,
    required this.moduleId,
    required this.label,
    required this.text,
  });

  @override
  State<NarrationPlayer> createState() => _NarrationPlayerState();
}

class _NarrationPlayerState extends State<NarrationPlayer> {
  final _audioApi = AudioApi();
  final _player = AudioPlayer();

  String? _url;
  bool _loading = false;
  bool _playing = false;
  String? _error;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  bool _seeking = false;

  @override
  void initState() {
    super.initState();
    _player.onPlayerStateChanged.listen((state) {
      if (!mounted) return;
      setState(() => _playing = state == PlayerState.playing);
    });
    _player.onPositionChanged.listen((pos) {
      if (!mounted || _seeking) return;
      setState(() => _position = pos);
    });
    _player.onDurationChanged.listen((dur) {
      if (!mounted) return;
      setState(() => _duration = dur);
    });
    _player.onPlayerComplete.listen((_) {
      if (!mounted) return;
      setState(() => _position = Duration.zero);
    });
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _onTap() async {
    setState(() => _error = null);

    if (_playing) {
      await _player.pause();
      return;
    }
    if (_url != null) {
      await _player.resume();
      return;
    }

    setState(() => _loading = true);
    try {
      final settings = context.read<NarrationSettingsProvider>();
      final url = await _audioApi.generate(
        widget.lessonId,
        widget.moduleId,
        text: widget.text,
        voice: settings.voice,
        style: settings.style,
      );
      _url = url;
      await _player.play(UrlSource(url));
    } catch (e) {
      setState(() => _error = 'Narration failed. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _onRestart() async {
    if (_url == null) return;
    await _player.seek(Duration.zero);
    setState(() => _position = Duration.zero);
    if (!_playing) await _player.resume();
  }

  @override
  void didUpdateWidget(covariant NarrationPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Text changed under us (e.g. content was regenerated) — the old
    // cached URL no longer matches, so drop it and start fresh next tap.
    if (oldWidget.text != widget.text) {
      _url = null;
      _position = Duration.zero;
      _duration = Duration.zero;
      _player.stop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasDuration = _duration.inMilliseconds > 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Row(
          children: [
            OutlinedButton.icon(
              onPressed: _loading ? null : _onTap,
              icon: _loading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(_playing ? Icons.pause : Icons.volume_up, size: 18),
              label: Text(
                _loading ? 'Preparing…' : (_playing ? 'Pause' : 'Listen: ${widget.label}'),
              ),
            ),
            if (_url != null && !_loading) ...[
              const SizedBox(width: 8),
              IconButton(
                onPressed: _onRestart,
                icon: const Icon(Icons.replay, size: 20),
                tooltip: 'Restart',
                visualDensity: VisualDensity.compact,
              ),
            ],
          ],
        ),
        if (hasDuration) ...[
          Row(
            children: [
              SizedBox(
                width: 40,
                child: Text(
                  _formatDuration(_position),
                  style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                  textAlign: TextAlign.right,
                ),
              ),
              Expanded(
                child: SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    trackHeight: 3,
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                  ),
                  child: Slider(
                    value: _position.inMilliseconds
                        .clamp(0, _duration.inMilliseconds)
                        .toDouble(),
                    max: _duration.inMilliseconds.toDouble(),
                    onChangeStart: (_) => _seeking = true,
                    onChanged: (v) => setState(() => _position = Duration(milliseconds: v.round())),
                    onChangeEnd: (v) async {
                      await _player.seek(Duration(milliseconds: v.round()));
                      _seeking = false;
                    },
                  ),
                ),
              ),
              SizedBox(
                width: 40,
                child: Text(
                  _formatDuration(_duration),
                  style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                ),
              ),
            ],
          ),
        ],
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(_error!, style: const TextStyle(color: AppColors.destructive, fontWeight: FontWeight.bold)),
          ),
      ],
    );
  }
}
