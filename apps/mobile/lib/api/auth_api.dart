import '../models/user.dart';
import 'api_client.dart';

class AuthApi {
  final _client = ApiClient.instance;

  Future<(AppUser, String)> register(String name, String email, String password) async {
    final data = await _client.post('/auth/register', {
      'name': name,
      'email': email,
      'password': password,
    }) as Map<String, dynamic>;
    return (AppUser.fromJson(data['user'] as Map<String, dynamic>), data['accessToken'] as String);
  }

  Future<(AppUser, String)> login(String email, String password) async {
    final data = await _client.post('/auth/login', {
      'email': email,
      'password': password,
    }) as Map<String, dynamic>;
    return (AppUser.fromJson(data['user'] as Map<String, dynamic>), data['accessToken'] as String);
  }

  Future<void> logout() async {
    await _client.post('/auth/logout');
  }

  Future<AppUser> me() async {
    final data = await _client.get('/auth/me') as Map<String, dynamic>;
    return AppUser.fromJson(data['user'] as Map<String, dynamic>);
  }
}
