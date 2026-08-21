/// Mirrors the backend's ApiError envelope (packages/types) exactly, so a
/// caught error's `.code` can be switched on the same way the web client's
/// ApiClientError is used (e.g. checking for "AUTH_REQUIRED").
class ApiException implements Exception {
  final String code;
  final String message;
  final int statusCode;
  final Map<String, dynamic>? details;

  ApiException({
    required this.code,
    required this.message,
    required this.statusCode,
    this.details,
  });

  @override
  String toString() => message;
}
