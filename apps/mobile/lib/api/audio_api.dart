import 'api_client.dart';
import '../core/constants/api_config.dart';

class AudioApi {
  final _client = ApiClient.instance;

  /// Returns the full playable URL (media base + relative path from the
  /// server) — the caller (NarrationPlayer widget) hands this straight to
  /// an AudioPlayer. Whether this call actually generates new audio or
  /// returns an already-cached clip is entirely the server's decision
  /// (same content+voice+style = same cached URL); the client doesn't need
  /// to know which happened.
  Future<String> generate(
    String lessonId,
    String moduleId, {
    required String text,
    required String voice,
    required String style,
  }) async {
    final data = await _client.post('/lessons/$lessonId/audio/$moduleId/generate', {
      'text': text,
      'voice': voice,
      'style': style,
    }) as Map<String, dynamic>;
    final relativeUrl = data['url'] as String;
    return '${ApiConfig.mediaBaseUrl}$relativeUrl';
  }
}
