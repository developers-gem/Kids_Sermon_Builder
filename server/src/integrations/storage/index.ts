// import { mkdir, writeFile } from "node:fs/promises";
// import path from "node:path";
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { env } from "../../config/env.js";

// export interface SavedMedia {
//   /**
//    * Public URL the frontend/browser can fetch.
//    */
//   url: string;
// }

// let s3Client: S3Client | null = null;

// // function getS3Client(): S3Client {
// //   if (!s3Client) {
// //     const region =
// //       env.STORAGE_S3_REGION ||
// //       process.env.STORAGE_S3_REGION ||
// //       "eu-west-1";

// //     const accessKeyId =
// //       env.STORAGE_S3_ACCESS_KEY_ID ||
// //       process.env.STORAGE_S3_ACCESS_KEY_ID;

// //     const secretAccessKey =
// //       env.STORAGE_S3_SECRET_ACCESS_KEY ||
// //       process.env.STORAGE_S3_SECRET_ACCESS_KEY;

// //     if (!accessKeyId || !secretAccessKey) {
// //       console.error("[Storage:S3] ❌ Missing AWS credentials in environment variables!");
// //       throw new Error("Missing AWS S3 credentials (STORAGE_S3_ACCESS_KEY_ID / STORAGE_S3_SECRET_ACCESS_KEY)");
// //     }

// //     s3Client = new S3Client({
// //       region,
// //       credentials: {
// //         accessKeyId,
// //         secretAccessKey,
// //       },
// //     });
// //   }

// //   return s3Client;
// // }

// function getS3Client(): S3Client {
//   if (!s3Client) {
//     const region =
//       env.STORAGE_S3_REGION ||
//       process.env.STORAGE_S3_REGION ||
//       // "us-east-1";
//       "eu-east-1"

//     const accessKeyId =
//       env.STORAGE_S3_ACCESS_KEY_ID ||
//       process.env.STORAGE_S3_ACCESS_KEY_ID;

//     const secretAccessKey =
//       env.STORAGE_S3_SECRET_ACCESS_KEY ||
//       process.env.STORAGE_S3_SECRET_ACCESS_KEY;

//     if (!accessKeyId || !secretAccessKey) {
//       throw new Error("Missing AWS credentials");
//     }

//     s3Client = new S3Client({
//       region,
//       credentials: {
//         accessKeyId,
//         secretAccessKey,
//       },
//     });
//   }

//   return s3Client;
// }

// function guessContentType(filename: string): string {
//   const ext = path.extname(filename).toLowerCase();

//   const types: Record<string, string> = {
//     ".mp3": "audio/mpeg",
//     ".png": "image/png",
//     ".jpg": "image/jpeg",
//     ".jpeg": "image/jpeg",
//     ".pdf": "application/pdf",
//   };

//   return types[ext] ?? "application/octet-stream";
// }

// /**
//  * Save media to the local filesystem.
//  */
// async function saveLocal(
//   buffer: Buffer,
//   subdir: string,
//   filename: string,
// ): Promise<SavedMedia> {
//   const localDir = env.STORAGE_LOCAL_DIR || process.env.STORAGE_LOCAL_DIR || "storage";
//   const dir = path.resolve(localDir, subdir);

//   await mkdir(dir, {
//     recursive: true,
//   });

//   const filePath = path.join(dir, filename);
//   await writeFile(filePath, buffer);

//   const rawBaseUrl =
//     (env as Record<string, any>).API_PUBLIC_URL ||
//     process.env.API_PUBLIC_URL ||
//     "http://localhost:4000";
//   const publicBaseUrl = rawBaseUrl.replace(/\/$/, "");

//   const mediaPath = `${subdir}/${filename}`
//     .split("/")
//     .map(encodeURIComponent)
//     .join("/");

//   const url = `${publicBaseUrl}/media/${mediaPath}`;

//   console.log(`[Storage:Local] File saved locally at: ${filePath}`);
//   console.log(`[Storage:Local] Public URL: ${url}`);

//   return { url };
// }

// /**
//  * Save media to S3.
//  */
// async function saveS3(
//   buffer: Buffer,
//   subdir: string,
//   filename: string,
// ): Promise<SavedMedia> {
//   const bucket =
//     env.STORAGE_S3_BUCKET ||
//     process.env.STORAGE_S3_BUCKET ||
//     "s3-developer";

//   const region =
//     env.STORAGE_S3_REGION ||
//     process.env.STORAGE_S3_REGION ||
//     "eu-west-1";

//   const key = `${subdir}/${filename}`;
//   const client = getS3Client();

//   console.log(`[Storage:S3] ⏳ Uploading to bucket "${bucket}" at key "${key}"...`);

//   await client.send(
//     new PutObjectCommand({
//       Bucket: bucket,
//       Key: key,
//       Body: buffer,
//       ContentType: guessContentType(filename),
//       CacheControl: "public, max-age=2592000, immutable",
//     }),
//   );

//   const base =
//     env.STORAGE_S3_PUBLIC_URL ||
//     process.env.STORAGE_S3_PUBLIC_URL ||
//     `https://${bucket}.s3.${region}.amazonaws.com`;

//   // Safely URL-encode key segments in case filename contains special characters
//   const encodedKey = key
//     .split("/")
//     .map(encodeURIComponent)
//     .join("/");

//   const finalUrl = `${base.replace(/\/$/, "")}/${encodedKey}`;

//   console.log(`[Storage:S3] ✅ Upload successful!`);
//   console.log(`[Storage:S3] S3 Key: ${key}`);
//   console.log(`[Storage:S3] Public S3 URL: ${finalUrl}`);

//   return {
//     url: finalUrl,
//   };
// }

// /**
//  * Save generated media and return a public URL.
//  */
// export async function saveMedia(
//   buffer: Buffer,
//   subdir: string,
//   filename: string,
// ): Promise<SavedMedia> {
//   // Prevent 'undefined' or empty directory paths
//   const safeSubdir = subdir && subdir !== "undefined" ? subdir : "audio";

//   // Check driver flag (safe string fallback)
//   const rawDriver = env.STORAGE_DRIVER ?? process.env.STORAGE_DRIVER ?? "s3";
//   const driver = String(rawDriver).trim().toLowerCase();

//   console.log(`[Storage] Selected storage driver: "${driver}"`);

//   if (driver === "s3") {
//     return saveS3(buffer, safeSubdir, filename);
//   }

//   return saveLocal(buffer, safeSubdir, filename);
// }


// from here this code is complet to save the audio on the BUcket

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";

export interface SavedMedia {
  /**
   * Public URL the frontend/browser can fetch.
   */
  url: string;
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const region =
      env.STORAGE_S3_REGION ||
      process.env.STORAGE_S3_REGION ||
      "us-east-1";

    const accessKeyId =
      env.STORAGE_S3_ACCESS_KEY_ID ||
      process.env.STORAGE_S3_ACCESS_KEY_ID;

    const secretAccessKey =
      env.STORAGE_S3_SECRET_ACCESS_KEY ||
      process.env.STORAGE_S3_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "Missing AWS S3 credentials (STORAGE_S3_ACCESS_KEY_ID / STORAGE_S3_SECRET_ACCESS_KEY)",
      );
    }

    s3Client = new S3Client({
      region: region.trim(),
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      },
    });
  }

  return s3Client;
}

function guessContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();

  const types: Record<string, string> = {
    ".mp3": "audio/mpeg",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pdf": "application/pdf",
  };

  return types[ext] ?? "application/octet-stream";
}

/**
 * Save media to the local filesystem.
 */
async function saveLocal(
  buffer: Buffer,
  subdir: string,
  filename: string,
): Promise<SavedMedia> {
  const localDir =
    env.STORAGE_LOCAL_DIR ||
    process.env.STORAGE_LOCAL_DIR ||
    "storage";
  const dir = path.resolve(localDir, subdir);

  await mkdir(dir, { recursive: true });

  const filePath = path.join(dir, filename);
  await writeFile(filePath, buffer);

  const rawBaseUrl =
    (env as Record<string, any>).API_PUBLIC_URL ||
    process.env.API_PUBLIC_URL ||
    "http://localhost:4000";
  const publicBaseUrl = rawBaseUrl.replace(/\/$/, "");

  const mediaPath = `${subdir}/${filename}`
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const url = `${publicBaseUrl}/media/${mediaPath}`;

  console.log(`[Storage:Local] File saved locally at: ${filePath}`);
  console.log(`[Storage:Local] Public URL: ${url}`);

  return { url };
}

/**
 * Save media to S3.
 */
async function saveS3(
  buffer: Buffer,
  subdir: string,
  filename: string,
): Promise<SavedMedia> {
  const bucket =
    env.STORAGE_S3_BUCKET ||
    process.env.STORAGE_S3_BUCKET;

  const region =
    env.STORAGE_S3_REGION ||
    process.env.STORAGE_S3_REGION ||
    "us-east-1";

  if (!bucket) {
    throw new Error("Missing STORAGE_S3_BUCKET environment variable");
  }

  const cleanBucket = bucket.trim();
  const cleanRegion = region.trim();
  const key = `${subdir}/${filename}`;
  const client = getS3Client();

  console.log(
    `[Storage:S3] ⏳ Uploading to bucket "${cleanBucket}" (region: ${cleanRegion}) at key "${key}"...`,
  );

  await client.send(
    new PutObjectCommand({
      Bucket: cleanBucket,
      Key: key,
      Body: buffer,
      ContentType: guessContentType(filename),
      CacheControl: "public, max-age=2592000, immutable",
    }),
  );

  const base =
    env.STORAGE_S3_PUBLIC_URL ||
    process.env.STORAGE_S3_PUBLIC_URL ||
    `https://${cleanBucket}.s3.${cleanRegion}.amazonaws.com`;

  const encodedKey = key
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const finalUrl = `${base.replace(/\/$/, "")}/${encodedKey}`;

  console.log(`[Storage:S3] ✅ Upload successful!`);
  console.log(`[Storage:S3] Public S3 URL: ${finalUrl}`);

  return {
    url: finalUrl,
  };
}

/**
 * Save generated media and return a public URL.
 */
export async function saveMedia(
  buffer: Buffer,
  subdir: string,
  filename: string,
): Promise<SavedMedia> {
  const safeSubdir = subdir && subdir !== "undefined" ? subdir : "audio";

  const rawDriver = env.STORAGE_DRIVER ?? process.env.STORAGE_DRIVER ?? "s3";
  const driver = String(rawDriver).trim().toLowerCase();

  console.log(`[Storage] Selected storage driver: "${driver}"`);

  if (driver === "s3") {
    return saveS3(buffer, safeSubdir, filename);
  }

  return saveLocal(buffer, safeSubdir, filename);
}

// import { mkdir, writeFile } from "node:fs/promises";
// import path from "node:path";
// import { env } from "../../config/env.js";

// export interface SavedMedia {
//   /**
//    * Public URL the frontend/browser can fetch.
//    */
//   url: string;
// }

// function guessContentType(filename: string): string {
//   const ext = path.extname(filename).toLowerCase();

//   const types: Record<string, string> = {
//     ".mp3": "audio/mpeg",
//     ".png": "image/png",
//     ".jpg": "image/jpeg",
//     ".jpeg": "image/jpeg",
//     ".pdf": "application/pdf",
//   };

//   return types[ext] ?? "application/octet-stream";
// }

// /**
//  * Save media to the local filesystem inside the project storage directory.
//  */
// async function saveLocal(
//   buffer: Buffer,
//   subdir: string,
//   filename: string,
// ): Promise<SavedMedia> {
//   // Resolve storage directory relative to project root
//   const baseStorageDir =
//     env.STORAGE_LOCAL_DIR ||
//     process.env.STORAGE_LOCAL_DIR ||
//     "storage";

//   const targetDir = path.resolve(process.cwd(), baseStorageDir, subdir);

//   // Recursively ensure folder exists
//   await mkdir(targetDir, { recursive: true });

//   const filePath = path.join(targetDir, filename);
//   await writeFile(filePath, buffer);

//   // Build the public URL to stream the file via Express static route
//   const rawBaseUrl =
//     (env as Record<string, any>).API_PUBLIC_URL ||
//     process.env.API_PUBLIC_URL ||
//     "http://localhost:4000";

//   const publicBaseUrl = rawBaseUrl.replace(/\/$/, "");

//   const mediaPath = `${subdir}/${filename}`
//     .split("/")
//     .map(encodeURIComponent)
//     .join("/");

//   const url = `${publicBaseUrl}/media/${mediaPath}`;

//   console.log(`[Storage:Local] ✅ File saved at: ${filePath}`);
//   console.log(`[Storage:Local] Content-Type: ${guessContentType(filename)}`);
//   console.log(`[Storage:Local] Public URL: ${url}`);

//   return { url };
// }

// /**
//  * Save generated media locally and return a public static URL.
//  */

// export async function saveMedia(
//   buffer: Buffer,
//   subdir: string,
//   filename: string,
// ): Promise<SavedMedia> {
//   const safeSubdir = subdir && subdir !== "undefined" ? subdir : "audio";

//   console.log(`[Storage] Storing "${filename}" in local directory...`);
//   return saveLocal(buffer, safeSubdir, filename);
// }