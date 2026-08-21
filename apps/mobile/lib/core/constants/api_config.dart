/// The backend base URL. Passed at build/run time with:
///   flutter run --dart-define=API_BASE_URL=http://localhost:4000/api
///   flutter build apk --dart-define=API_BASE_URL=https://api.kidssermonbuilder.com/api
///
/// Deliberately not hardcoded to any environment — the web app's
/// equivalent is a same-origin Vite proxy, but a mobile app has no
/// "same origin" to lean on, so this has to be explicit.
class ApiConfig {
  ApiConfig._();

  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:4000/api',
  );

  /// Base URL without the trailing /api, for fetching /media/* files
  /// (cached narration audio) which live outside the API namespace.
  static String get mediaBaseUrl =>
      baseUrl.endsWith('/api') ? baseUrl.substring(0, baseUrl.length - 4) : baseUrl;
}
