import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/constants/api_config.dart';
import '../core/errors/api_exception.dart';

/// Central HTTP client for the REST API. Mirrors apps/web/src/api/client.ts:
/// same JSON envelope ({success, data} | {success, error}), same in-memory
/// access token.
///
/// One real difference from the web client: auth here (see
/// server/src/controllers/authController.ts) issues the refresh token as an
/// httpOnly cookie, which only means anything to an actual browser. A
/// mobile HTTP client has no browser cookie jar, so this class captures the
/// `Set-Cookie` header itself on login/register, stores the token value in
/// flutter_secure_storage, and manually replays it as a `Cookie` header on
/// /auth/refresh. httpOnly only blocks JavaScript's `document.cookie` — it
/// doesn't stop a non-browser client from reading the header directly, so
/// this isn't a workaround so much as just doing by hand what a browser
/// does automatically.
///
/// Network resilience (Prompt 25): every request goes through `_send`,
/// which applies a timeout and translates connectivity failures
/// (SocketException — no signal, DNS failure, server unreachable) and
/// timeouts into a single `NETWORK_ERROR` ApiException with a message
/// meant to be shown directly, rather than letting a raw
/// SocketException/TimeoutException reach a screen's catch block as an
/// unrecognized exception type. This is graceful degradation, not full
/// offline support — there's no request queue, no local cache of
/// previously-fetched lessons, and no background sync. A dropped
/// connection surfaces a clear, retryable error; it doesn't let the app
/// keep working without one.
class ApiClient {
  ApiClient._internal();
  static final ApiClient instance = ApiClient._internal();

  final http.Client _http = http.Client();
  final _secureStorage = const FlutterSecureStorage();
  static const _refreshCookieKey = 'ksb_refresh_cookie';

  /// Generous enough for AI generation (which can genuinely take up to a
  /// minute, same as the web app's own copy warns) without leaving a
  /// dropped connection hanging indefinitely.
  static const _timeout = Duration(seconds: 75);

  String? _accessToken;

  void setAccessToken(String? token) {
    _accessToken = token;
  }

  String? get accessToken => _accessToken;

  Future<void> _storeRefreshCookieFromResponse(http.Response res) async {
    final setCookie = res.headers['set-cookie'];
    if (setCookie == null) return;
    // "ksb_refresh_token=abc.def.ghi; Path=/api/auth; HttpOnly; SameSite=Lax"
    final match = RegExp(r'ksb_refresh_token=([^;]+)').firstMatch(setCookie);
    if (match == null) return;
    await _secureStorage.write(key: _refreshCookieKey, value: match.group(1));
  }

  Future<String?> _readStoredRefreshCookie() {
    return _secureStorage.read(key: _refreshCookieKey);
  }

  Future<void> clearStoredRefreshCookie() {
    return _secureStorage.delete(key: _refreshCookieKey);
  }

  Map<String, String> _headers({bool json = true}) => {
        if (json) 'Content-Type': 'application/json',
        if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
      };

  Uri _uri(String path) => Uri.parse('${ApiConfig.baseUrl}$path');

  /// Wraps every outbound request with a timeout and translates
  /// connectivity-layer failures into a single, catchable ApiException
  /// instead of letting SocketException/TimeoutException/ClientException
  /// propagate as unrecognized exception types to the UI.
  Future<http.Response> _send(Future<http.Response> Function() request) async {
    try {
      return await request().timeout(_timeout);
    } on TimeoutException {
      throw ApiException(
        code: 'NETWORK_ERROR',
        message: 'That took too long to respond. Please check your connection and try again.',
        statusCode: 0,
      );
    } on SocketException {
      throw ApiException(
        code: 'NETWORK_ERROR',
        message: "Couldn't reach the server. Please check your connection and try again.",
        statusCode: 0,
      );
    } on http.ClientException {
      throw ApiException(
        code: 'NETWORK_ERROR',
        message: "Couldn't reach the server. Please check your connection and try again.",
        statusCode: 0,
      );
    }
  }

  dynamic _decodeEnvelope(http.Response res) {
    Map<String, dynamic> body;
    try {
      body = jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException(
        code: 'INTERNAL_ERROR',
        message: 'The server returned an unexpected response.',
        statusCode: res.statusCode,
      );
    }

    if (body['success'] != true) {
      final error = body['error'] as Map<String, dynamic>? ?? {};
      throw ApiException(
        code: error['code'] as String? ?? 'INTERNAL_ERROR',
        message: error['message'] as String? ?? 'Something went wrong.',
        statusCode: res.statusCode,
        details: error['details'] as Map<String, dynamic>?,
      );
    }
    return body['data'];
  }

  Future<dynamic> get(String path) async {
    final res = await _send(() => _http.get(_uri(path), headers: _headers()));
    return _decodeEnvelope(res);
  }

  Future<dynamic> post(String path, [Map<String, dynamic>? data]) async {
    final res = await _send(
      () => _http.post(_uri(path), headers: _headers(), body: data != null ? jsonEncode(data) : null),
    );
    await _storeRefreshCookieFromResponse(res);
    return _decodeEnvelope(res);
  }

  Future<dynamic> put(String path, [Map<String, dynamic>? data]) async {
    final res = await _send(
      () => _http.put(_uri(path), headers: _headers(), body: data != null ? jsonEncode(data) : null),
    );
    return _decodeEnvelope(res);
  }

  Future<dynamic> patch(String path, [Map<String, dynamic>? data]) async {
    final res = await _send(
      () => _http.patch(_uri(path), headers: _headers(), body: data != null ? jsonEncode(data) : null),
    );
    return _decodeEnvelope(res);
  }

  Future<dynamic> delete(String path) async {
    final res = await _send(() => _http.delete(_uri(path), headers: _headers()));
    return _decodeEnvelope(res);
  }

  /// Attempts a silent token refresh using the stored cookie value. Returns
  /// the new access token on success, or null if there's no stored cookie,
  /// it's no longer valid (expired / logged out elsewhere), or the network
  /// is unavailable — all three are treated the same way by the caller
  /// (AuthProvider.tryRestoreSession): fall back to a guest state rather
  /// than blocking app startup on connectivity.
  Future<String?> tryRefresh() async {
    final cookie = await _readStoredRefreshCookie();
    if (cookie == null) return null;

    http.Response res;
    try {
      res = await _send(
        () => _http.post(
          _uri('/auth/refresh'),
          headers: {
            ..._headers(),
            'Cookie': 'ksb_refresh_token=$cookie',
          },
        ),
      );
    } on ApiException {
      // Network-layer failure during startup — don't wipe the stored
      // cookie over a connectivity blip; just start this session as a
      // guest and let the next successful refresh pick it back up.
      return null;
    }

    if (res.statusCode != 200) {
      await clearStoredRefreshCookie();
      return null;
    }

    try {
      final data = _decodeEnvelope(res) as Map<String, dynamic>;
      final token = data['accessToken'] as String?;
      _accessToken = token;
      return token;
    } catch (_) {
      await clearStoredRefreshCookie();
      return null;
    }
  }

  /// Downloads a binary response (PDF) as bytes, using the same auth header
  /// as JSON requests — mirrors apps/web/src/api/client.ts's fetchBinary,
  /// same reasoning: a plain unauthenticated request would 404 on a
  /// private lesson the caller actually owns.
  Future<List<int>> getBytes(String path) async {
    final res = await _send(() => _http.get(_uri(path), headers: _headers(json: false)));
    if (res.statusCode != 200) {
      throw ApiException(
        code: 'INTERNAL_ERROR',
        message: 'Download failed (${res.statusCode}).',
        statusCode: res.statusCode,
      );
    }
    return res.bodyBytes;
  }
}
