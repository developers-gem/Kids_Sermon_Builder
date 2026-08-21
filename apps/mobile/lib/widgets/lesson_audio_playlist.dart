import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:provider/provider.dart';
import '../api/audio_api.dart';
import '../core/theme/app_theme.dart';
import '../providers/narration_settings_provider.dart';

class PlaylistTrack {
  final String moduleId;
  final String label;
  final String text;
  const PlaylistTrack({required this.moduleId, required this.label, required this.text});
}

class LessonAudioPlaylist extends StatefulWidget {
  final String lessonId;
  final List<PlaylistTrack> tracks;

  const LessonAudioPlaylist({super.key, required this.lessonId, required this.tracks});

  @override
  State<LessonAudioPlaylist> createState() => _LessonAudioPlaylistState();
}

class _LessonAudioPlaylistState extends State<LessonAudioPlaylist> {
  final _audioApi = AudioApi();
  final _player = AudioPlayer();

  int? _index;
  bool _loading = false;
  bool _playing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _player.onPlayerStateChanged.listen((state) {
      if (!mounted) return;
      setState(() => _playing = state == PlayerState.playing);
    });
    _player.onPlayerComplete.listen((_) {
      if (!mounted || _index == null) return;
      _loadAndPlay(_index! + 1);
    });
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _loadAndPlay(int i) async {
    if (i < 0 || i >= widget.tracks.length) {
      setState(() {
        _index = null;
        _playing = false;
      });
      await _player.stop();
      return;
    }

    setState(() {
      _error = null;
      _index = i;
      _loading = true;
    });

    try {
      final settings = context.read<NarrationSettingsProvider>();
      final track = widget.tracks[i];
      final url = await _audioApi.generate(
        widget.lessonId,
        track.moduleId,
        text: track.text,
        voice: settings.voice,
        style: settings.style,
      );
      await _player.play(UrlSource(url));
    } catch (e) {
      setState(() => _error = "Couldn't play this section.");
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _onPlayPause() async {
    if (_index == null) {
      await _loadAndPlay(0);
      return;
    }
    if (_playing) {
      await _player.pause();
    } else {
      await _player.resume();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.tracks.isEmpty) return const SizedBox.shrink();
    final current = _index != null && _index! < widget.tracks.length ? widget.tracks[_index!] : null;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Play whole lesson', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 4),
            Text(
              'Plays through ${widget.tracks.length} section${widget.tracks.length == 1 ? "" : "s"} back to back.',
              style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                IconButton(
                  onPressed: _index == null || _index == 0 || _loading ? null : () => _loadAndPlay(_index! - 1),
                  icon: const Icon(Icons.skip_previous),
                ),
                IconButton.filled(
                  onPressed: _loading || widget.tracks.isEmpty ? null : _onPlayPause,
                  icon: _loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Icon(_playing ? Icons.pause : Icons.play_arrow),
                ),
                IconButton(
                  onPressed: _index == null || _index! >= widget.tracks.length - 1 || _loading
                      ? null
                      : () => _loadAndPlay(_index! + 1),
                  icon: const Icon(Icons.skip_next),
                ),
                if (_index != null)
                  IconButton(
                    onPressed: () => _loadAndPlay(-1),
                    icon: const Icon(Icons.stop),
                  ),
                const Spacer(),
                if (current != null)
                  Text(
                    '${_index! + 1} / ${widget.tracks.length} · ${current.label}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.mutedForeground),
                  ),
              ],
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_error!, style: const TextStyle(color: AppColors.destructive, fontWeight: FontWeight.bold)),
              ),
          ],
        ),
      ),
    );
  }
}
