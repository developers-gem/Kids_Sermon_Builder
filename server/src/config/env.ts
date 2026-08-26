import "dotenv/config";
import { z } from "zod";

/**
 * Every environment variable the backend needs,
 * validated once when the server starts.
 */
const EnvSchema = z.object({
  // =========================
  // SERVER
  // =========================
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(4000),

  // =========================
  // DATABASE
  // =========================
  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required"),

  // =========================
  // JWT AUTHENTICATION
  // =========================
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, "JWT_ACCESS_SECRET must be at least 16 characters"),

  JWT_REFRESH_SECRET: z
    .string()
    .min(16, "JWT_REFRESH_SECRET must be at least 16 characters"),

  JWT_ACCESS_TTL: z
    .string()
    .default("15m"),

  JWT_REFRESH_TTL: z
    .string()
    .default("30d"),

  // =========================
  // FRONTEND URL
  // =========================
  WEB_ORIGIN: z
    .string()
    .url()
    .default("http://localhost:5173"),

  // =========================
  // BACKEND URL
  // =========================
  API_PUBLIC_URL: z
    .string()
    .url()
    .default("http://localhost:4000"),

  // =========================
  // EMAIL / SMTP
  // =========================
  SMTP_HOST: z
    .string()
    .min(1, "SMTP_HOST is required"),

  SMTP_PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(587),

  SMTP_SECURE: z
    .string()
    .transform((value) => value === "true")
    .default("false"),

  SMTP_USER: z
    .string()
    .min(1, "SMTP_USER is required"),

  SMTP_PASSWORD: z
    .string()
    .min(1, "SMTP_PASSWORD is required"),

  SMTP_FROM: z
    .string()
    .min(1, "SMTP_FROM is required"),

  // =========================
  // AI LESSON GENERATION
  // =========================
  LOVABLE_API_KEY: z.string().optional(),

  AI_GATEWAY_URL: z
    .string()
    .url()
    .default(
      "https://ai.gateway.lovable.dev/v1/chat/completions"
    ),

  // =========================
  // OPENAI TEXT-TO-SPEECH
  // =========================
  OPENAI_API_KEY: z
    .string()
    .min(1, "OPENAI_API_KEY is required"),

  // =========================
  // STORAGE
  // =========================
  STORAGE_DRIVER: z
    .enum(["local", "s3"])
    .default("local"),

  STORAGE_LOCAL_DIR: z
    .string()
    .default("./storage"),

  // =========================
  // AWS S3 STORAGE
  // =========================
  STORAGE_S3_BUCKET: z
    .string()
    .optional(),

  STORAGE_S3_REGION: z
    .string()
    .optional(),

  STORAGE_S3_ACCESS_KEY_ID: z
    .string()
    .optional(),

  STORAGE_S3_SECRET_ACCESS_KEY: z
    .string()
    .optional(),

  /**
   * Optional public base URL.
   *
   * Example:
   * https://your-bucket.s3.us-east-1.amazonaws.com
   */
  STORAGE_S3_PUBLIC_URL: z
    .string()
    .url()
    .optional(),
});

/**
 * Validate environment variables.
 */
const baseParsed = EnvSchema.safeParse(process.env);

if (!baseParsed.success) {
  console.error("❌ Invalid environment configuration:");

  console.error(
    baseParsed.error.flatten().fieldErrors
  );

  process.exit(1);
}

/**
 * Validate S3 configuration only when
 * STORAGE_DRIVER is set to "s3".
 */
if (baseParsed.data.STORAGE_DRIVER === "s3") {
  const missing = [
    "STORAGE_S3_BUCKET",
    "STORAGE_S3_REGION",
    "STORAGE_S3_ACCESS_KEY_ID",
    "STORAGE_S3_SECRET_ACCESS_KEY",
  ].filter((key) => {
    const value =
      baseParsed.data[
        key as keyof typeof baseParsed.data
      ];

    return !value;
  });

  if (missing.length > 0) {
    console.error("❌ Invalid environment configuration:");

    console.error(
      `STORAGE_DRIVER=s3 requires: ${missing.join(", ")}`
    );

    process.exit(1);
  }
}

/**
 * Export validated environment configuration.
 */
export const env = baseParsed.data;

/**
 * True when running in production.
 */
export const isProd =
  env.NODE_ENV === "production";