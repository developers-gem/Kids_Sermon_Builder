import '../models/lesson.dart';
import 'api_client.dart';

class LessonVersion {
  final String id;
  final String label;
  final String createdAt;
  LessonVersion({required this.id, required this.label, required this.createdAt});

  factory LessonVersion.fromJson(Map<String, dynamic> json) => LessonVersion(
        id: json['id'] as String? ?? json['_id'] as String? ?? '',
        label: json['label'] as String? ?? '',
        createdAt: json['createdAt'] as String? ?? '',
      );
}

class LessonsApi {
  final _client = ApiClient.instance;

  Future<Lesson> createFromStory(String storyId, List<String> activeModules) async {
    final data = await _client.post('/lessons', {
      'storyId': storyId,
      'activeModules': activeModules,
    }) as Map<String, dynamic>;
    return Lesson.fromJson(data['lesson'] as Map<String, dynamic>);
  }

  Future<List<Lesson>> list({String? status, bool? favorite, bool? archived}) async {
    final params = <String, String>{};
    if (status != null) params['status'] = status;
    if (favorite != null) params['favorite'] = favorite.toString();
    if (archived != null) params['archived'] = archived.toString();
    final qs = params.isEmpty ? '' : '?${Uri(queryParameters: params).query}';

    final data = await _client.get('/lessons$qs') as Map<String, dynamic>;
    return (data['lessons'] as List<dynamic>)
        .map((e) => Lesson.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Lesson> getById(String id) async {
    final data = await _client.get('/lessons/$id') as Map<String, dynamic>;
    return Lesson.fromJson(data['lesson'] as Map<String, dynamic>);
  }

  Future<Lesson> updateModules(String id, List<String> activeModules) async {
    final data =
        await _client.put('/lessons/$id/modules', {'activeModules': activeModules}) as Map<String, dynamic>;
    return Lesson.fromJson(data['lesson'] as Map<String, dynamic>);
  }

  Future<Lesson> reorderModules(String id, List<String> order) async {
    final data = await _client.post('/lessons/$id/modules/reorder', {'order': order}) as Map<String, dynamic>;
    return Lesson.fromJson(data['lesson'] as Map<String, dynamic>);
  }

  Future<Lesson> updateContent(String id, Map<String, dynamic> patch) async {
    final data = await _client.put('/lessons/$id', patch) as Map<String, dynamic>;
    return Lesson.fromJson(data['lesson'] as Map<String, dynamic>);
  }

  Future<Lesson> regenerateModule(String id, String moduleId, [String instruction = '']) async {
    final data = await _client.post(
      '/lessons/$id/modules/$moduleId/regenerate',
      {'instruction': instruction},
    ) as Map<String, dynamic>;
    return Lesson.fromJson(data['lesson'] as Map<String, dynamic>);
  }

  Future<Lesson> generateColoringPage(String id, [String instruction = '']) async {
    final data = await _client.post(
      '/lessons/$id/coloring-page/generate',
      {'instruction': instruction},
    ) as Map<String, dynamic>;
    return Lesson.fromJson(data['lesson'] as Map<String, dynamic>);
  }

  Future<Lesson> duplicate(String id) async {
    final data = await _client.post('/lessons/$id/duplicate') as Map<String, dynamic>;
    return Lesson.fromJson(data['lesson'] as Map<String, dynamic>);
  }

  Future<void> favorite(String id) => _client.post('/lessons/$id/favorite');
  Future<void> unfavorite(String id) => _client.delete('/lessons/$id/favorite');
  Future<void> archive(String id) => _client.post('/lessons/$id/archive');
  Future<void> unarchive(String id) => _client.delete('/lessons/$id/archive');
  Future<void> remove(String id) => _client.delete('/lessons/$id');

  Future<LessonVersion> saveVersion(String id, [String label = '']) async {
    final data = await _client.post('/lessons/$id/versions', {'label': label}) as Map<String, dynamic>;
    return LessonVersion.fromJson(data['version'] as Map<String, dynamic>);
  }

  Future<List<LessonVersion>> listVersions(String id) async {
    final data = await _client.get('/lessons/$id/versions') as Map<String, dynamic>;
    return (data['versions'] as List<dynamic>)
        .map((e) => LessonVersion.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Lesson> restoreVersion(String id, String versionId) async {
    final data = await _client.post('/lessons/$id/versions/$versionId/restore') as Map<String, dynamic>;
    return Lesson.fromJson(data['lesson'] as Map<String, dynamic>);
  }

  Future<String> createShareLink(String id) async {
    final data = await _client.post('/lessons/$id/share') as Map<String, dynamic>;
    return data['token'] as String;
  }

  Future<void> revokeShareLink(String id) => _client.delete('/lessons/$id/share');

  Future<List<int>> downloadPdf(String id, {String size = 'letter'}) =>
      _client.getBytes('/lessons/$id/pdf?size=$size');

  Future<List<int>> downloadColoringPagePdf(String id, {String size = 'letter'}) =>
      _client.getBytes('/lessons/$id/coloring-page/pdf?size=$size');
}

class SharedLessonsApi {
  final _client = ApiClient.instance;

  Future<Lesson> getByToken(String token) async {
    final data = await _client.get('/shared/$token') as Map<String, dynamic>;
    return Lesson.fromJson(data['lesson'] as Map<String, dynamic>);
  }

  Future<Lesson> duplicateFromToken(String token) async {
    final data = await _client.post('/shared/$token/duplicate') as Map<String, dynamic>;
    return Lesson.fromJson(data['lesson'] as Map<String, dynamic>);
  }
}
