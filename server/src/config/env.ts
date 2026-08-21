import "dotenv/config";
import { z } from "zod";

/**
 * Every environment variable the backend needs, validated once at boot.
 * Fail fast and loud instead of throwing a confusing error deep in a request.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 chars"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 chars"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),

  // AI / media provider — same gateway the prototype already used.
  LOVABLE_API_KEY: z.string().optional(),
  AI_GATEWAY_URL: z.string().url().default("https://ai.gateway.lovable.dev/v1/chat/completions"),
  TTS_GATEWAY_URL: z.string().url().default("https://ai.gateway.lovable.dev/v1/audio/speech"),

  // Object storage for generated media (illustrations, coloring pages, audio, PDFs).
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage"),
  // Only required when STORAGE_DRIVER=s3 — validated conditionally below,
  // not marked .optional() at the top level, so a misconfigured s3 setup
  // fails loudly at boot instead of failing confusingly on the first
  // upload.
  STORAGE_S3_BUCKET: z.string().optional(),
  STORAGE_S3_REGION: z.string().optional(),
  STORAGE_S3_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_S3_SECRET_ACCESS_KEY: z.string().optional(),
  /** Optional CDN/custom domain in front of the bucket; falls back to the bucket's own public URL. */
  STORAGE_S3_PUBLIC_URL: z.string().optional(),
});

const baseParsed = EnvSchema.safeParse(process.env);

if (!baseParsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(baseParsed.error.flatten().fieldErrors);
  process.exit(1);
}

// Cross-field check: STORAGE_DRIVER=s3 needs its own required fields, but
// they can't be marked required at the schema level without breaking the
// (much more common) local-driver default. Checked here instead, so a
// misconfigured s3 setup fails loudly at boot rather than on the first
// upload attempt deep in a request.
if (baseParsed.data.STORAGE_DRIVER === "s3") {
  const missing = (
    ["STORAGE_S3_BUCKET", "STORAGE_S3_REGION", "STORAGE_S3_ACCESS_KEY_ID", "STORAGE_S3_SECRET_ACCESS_KEY"] as const
  ).filter((key) => !baseParsed.data[key]);
  if (missing.length > 0) {
    console.error("❌ Invalid environment configuration:");
    console.error(`STORAGE_DRIVER=s3 requires: ${missing.join(", ")}`);
    process.exit(1);
  }
}

export const env = baseParsed.data;
export const isProd = env.NODE_ENV === "production";
