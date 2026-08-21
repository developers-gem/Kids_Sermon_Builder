import 'api_exception.dart';

/// Mirrors apps/web/src/lib/errorMessages.ts: maps backend error codes (and
/// the client-side NETWORK_ERROR/TIMEOUT codes ApiClient adds) to
/// consistent, friendly copy instead of every screen inventing its own
/// fallback text or showing a raw exception message.
///
/// VALIDATION_ERROR is passed through as-is — it already carries a
/// specific, field-level message worth showing verbatim.
const Map<String, String> _friendlyMessages = {
  'AUTH_REQUIRED': 'Please log in to do that.',
  'FORBIDDEN': "You don't have permission to do that.",
  'NOT_FOUND': "That couldn't be found. It may have been deleted or moved.",
  'AI_GENERATION_FAILED': "The AI couldn't generate that right now. Please try again in a moment.",
  'AUDIO_GENERATION_FAILED': "Narration couldn't be generated right now. Please try again.",
  'IMAGE_GENERATION_FAILED': "The image couldn't be generated right now. Please try again.",
  'PDF_GENERATION_FAILED': "The PDF couldn't be created right now. Please try again.",
  'RATE_LIMITED': "You're doing that a bit too fast — please wait a moment and try again.",
  'INTERNAL_ERROR': 'Something went wrong on our end. Please try again.',
  // Client-side only — added by ApiClient._send, not the backend.
  'NETWORK_ERROR': "Couldn't reach the server. Please check your connection and try again.",
};

String friendlyErrorMessage(Object error, [String fallback = 'Something went wrong. Please try again.']) {
  if (error is ApiException) {
    if (error.code == 'VALIDATION_ERROR') return error.message;
    return _friendlyMessages[error.code] ?? (error.message.isNotEmpty ? error.message : fallback);
  }
  return fallback;
}
