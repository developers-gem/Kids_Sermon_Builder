/**
 * Structured application error. Every thrown error that should reach the
 * client as a clean 4xx/5xx response should be (or be wrapped into) one of
 * these — see middleware/errorHandler.ts.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static notFound(message = "Resource not found", details?: Record<string, unknown>) {
    return new AppError("NOT_FOUND", message, 404, details);
  }

  static forbidden(message = "You do not have access to this resource") {
    return new AppError("FORBIDDEN", message, 403);
  }

  static authRequired(message = "Authentication is required") {
    return new AppError("AUTH_REQUIRED", message, 401);
  }

  static validation(message = "Invalid request", details?: Record<string, unknown>) {
    return new AppError("VALIDATION_ERROR", message, 422, details);
  }

  static rateLimited(message = "Too many requests, please try again shortly") {
    return new AppError("RATE_LIMITED", message, 429);
  }

  static aiGenerationFailed(message: string) {
    return new AppError("AI_GENERATION_FAILED", message, 502);
  }

  static audioGenerationFailed(message: string) {
    return new AppError("AUDIO_GENERATION_FAILED", message, 502);
  }

  static imageGenerationFailed(message: string) {
    return new AppError("IMAGE_GENERATION_FAILED", message, 502);
  }

  static pdfGenerationFailed(message: string) {
    return new AppError("PDF_GENERATION_FAILED", message, 502);
  }

  static internal(message = "Something went wrong") {
    return new AppError("INTERNAL_ERROR", message, 500);
  }
}
