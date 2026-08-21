import '../models/story.dart';
import 'api_client.dart';

class StoriesApi {
  final _client = ApiClient.instance;

  Future<List<Story>> list({String? search, String? theme, String? ageGroup}) async {
    final params = <String, String>{};
    if (search != null && search.isNotEmpty) params['search'] = search;
    if (theme != null && theme.isNotEmpty) params['theme'] = theme;
    if (ageGroup != null && ageGroup.isNotEmpty) params['ageGroup'] = ageGroup;
    final qs = params.isEmpty ? '' : '?${Uri(queryParameters: params).query}';

    final data = await _client.get('/stories$qs') as Map<String, dynamic>;
    return (data['stories'] as List<dynamic>)
        .map((e) => Story.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Story>> featured() async {
    final data = await _client.get('/stories/featured') as Map<String, dynamic>;
    return (data['stories'] as List<dynamic>)
        .map((e) => Story.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Story> getById(String id) async {
    final data = await _client.get('/stories/$id') as Map<String, dynamic>;
    return Story.fromJson(data['story'] as Map<String, dynamic>);
  }
}
