import 'package:flutter/foundation.dart';
import '../api/api_client.dart';
import '../api/auth_api.dart';
import '../models/user.dart';

enum AuthStatus { loading, authenticated, guest }

class AuthProvider extends ChangeNotifier {
  final _authApi = AuthApi();
  final _client = ApiClient.instance;

  AppUser? _user;
  AuthStatus _status = AuthStatus.loading;

  AppUser? get user => _user;
  AuthStatus get status => _status;
  bool get isLoading => _status == AuthStatus.loading;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  /// Called once at app startup: tries to silently exchange a stored
  /// refresh cookie for a fresh access token, so closing and reopening the
  /// app doesn't sign the person out. Never throws — any failure just means
  /// "start as a guest," same as the web app's silent-refresh-on-load.
  Future<void> tryRestoreSession() async {
    try {
      final token = await _client.tryRefresh();
      if (token == null) {
        _status = AuthStatus.guest;
        notifyListeners();
        return;
      }
      _client.setAccessToken(token);
      _user = await _authApi.me();
      _status = AuthStatus.authenticated;
    } catch (_) {
      _client.setAccessToken(null);
      _user = null;
      _status = AuthStatus.guest;
    }
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final (user, accessToken) = await _authApi.login(email, password);
    _client.setAccessToken(accessToken);
    _user = user;
    _status = AuthStatus.authenticated;
    notifyListeners();
  }

  Future<void> register(String name, String email, String password) async {
    final (user, accessToken) = await _authApi.register(name, email, password);
    _client.setAccessToken(accessToken);
    _user = user;
    _status = AuthStatus.authenticated;
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await _authApi.logout();
    } finally {
      _client.setAccessToken(null);
      await _client.clearStoredRefreshCookie();
      _user = null;
      _status = AuthStatus.guest;
      notifyListeners();
    }
  }
}
