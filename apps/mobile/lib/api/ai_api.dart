import '../models/lesson.dart';
import 'api_client.dart';

class AiApi {
  final _client = ApiClient.instance;

  Future<Lesson> generateLesson({
    required String passage,
    required String ageGroup,
    required String style,
    required String styleDescription,
    String focus = '',
    bool withIllustration = true,
  }) async {
    final data = await _client.post('/ai/generate-lesson', {
      'passage': passage,
      'ageGroup': ageGroup,
      'style': style,
      'styleDescription': styleDescription,
      'focus': focus,
      'withIllustration': withIllustration,
    }) as Map<String, dynamic>;
    return Lesson.fromJson(data['lesson'] as Map<String, dynamic>);
  }
}
