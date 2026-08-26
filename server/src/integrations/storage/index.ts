// import { mkdir, writeFile } from "node:fs/promises";
// import path from "node:path";
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { env } from "../../config/env.js";

// export interface SavedMedia {
//   /** URL the client can fetch this from. */
//   url: string;
// }

// let s3Client: S3Client | null = null;
// function getS3Client(): S3Client {
//   if (!s3Client) {
//     s3Client = new S3Client({
//       region: env.STORAGE_S3_REGION!,
//       credentials: {
//         accessKeyId: env.STORAGE_S3_ACCESS_KEY_ID!,
//         secretAccessKey: env.STORAGE_S3_SECRET_ACCESS_KEY!,
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

// async function saveLocal(buffer: Buffer, subdir: string, filename: string): Promise<SavedMedia> {
//   const dir = path.resolve(env.STORAGE_LOCAL_DIR, subdir);
//   await mkdir(dir, { recursive: true });
//   const filePath = path.join(dir, filename);
//   await writeFile(filePath, buffer);
//   return { url: `/media/${subdir}/${filename}` };
// }

// /**
//  * Real S3 upload — not a stub. Structurally correct AWS SDK v3 usage
//  * (`PutObjectCommand` against a bucket/region/credentials set from env),
//  * but **never exercised against a live bucket**: this sandbox has no AWS
//  * credentials and no network route to S3 (not in the egress allowlist this
//  * was built under), so this path is verified by compiling and by code
//  * review only, not by an actual upload. Test against a real bucket before
//  * relying on it in production.
//  */
// async function saveS3(buffer: Buffer, subdir: string, filename: string): Promise<SavedMedia> {
//   const key = `${subdir}/${filename}`;
//   const client = getS3Client();

//   await client.send(
//     new PutObjectCommand({
//       Bucket: env.STORAGE_S3_BUCKET!,
//       Key: key,
//       Body: buffer,
//       ContentType: guessContentType(filename),
//       // Cache hard — filenames are content-hashed upstream (see
//       // audioService.ts), so the same key never points to different bytes.
//       CacheControl: "public, max-age=2592000, immutable",
//     }),
//   );

//   const base =
//     env.STORAGE_S3_PUBLIC_URL ?? `https://${env.STORAGE_S3_BUCKET}.s3.${env.STORAGE_S3_REGION}.amazonaws.com`;
//   return { url: `${base.replace(/\/$/, "")}/${key}` };
// }

// /**
//  * Saves a generated media file (currently: cached narration audio) and
//  * returns a URL to fetch it. Per Prompt 05 ("do not store large generated
//  * audio/image binaries directly inside MongoDB"), only this URL is ever
//  * persisted on a document — the bytes live here, outside the database.
//  */
// export async function saveMedia(
//   buffer: Buffer,
//   subdir: string,
//   filename: string,
// ): Promise<SavedMedia> {
//   return env.STORAGE_DRIVER === "s3" ? saveS3(buffer, subdir, filename) : saveLocal(buffer, subdir, filename);
// }


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
    s3Client = new S3Client({
      region: env.STORAGE_S3_REGION!,
      credentials: {
        accessKeyId: env.STORAGE_S3_ACCESS_KEY_ID!,
        secretAccessKey: env.STORAGE_S3_SECRET_ACCESS_KEY!,
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
 *
 * IMPORTANT:
 * We return an absolute backend URL.
 *
 * Relative URLs such as /media/audio/file.mp3 work locally with
 * the Vite proxy, but fail in production when the frontend and
 * backend are hosted on different domains.
 */
async function saveLocal(
  buffer: Buffer,
  subdir: string,
  filename: string,
): Promise<SavedMedia> {
  const dir = path.resolve(env.STORAGE_LOCAL_DIR, subdir);

  await mkdir(dir, {
    recursive: true,
  });

  const filePath = path.join(dir, filename);

  await writeFile(filePath, buffer);

  const publicBaseUrl = env.API_PUBLIC_URL.replace(/\/$/, "");

  const mediaPath = `${subdir}/${filename}`
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const url = `${publicBaseUrl}/media/${mediaPath}`;

  return {
    url,
  };
}

/**
 * Save media to S3.
 */
async function saveS3(
  buffer: Buffer,
  subdir: string,
  filename: string,
): Promise<SavedMedia> {
  const key = `${subdir}/${filename}`;

  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: env.STORAGE_S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: guessContentType(filename),
      CacheControl: "public, max-age=2592000, immutable",
    }),
  );

  const base =
    env.STORAGE_S3_PUBLIC_URL ??
    `https://${env.STORAGE_S3_BUCKET}.s3.${env.STORAGE_S3_REGION}.amazonaws.com`;

  return {
    url: `${base.replace(/\/$/, "")}/${key}`,
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
  if (env.STORAGE_DRIVER === "s3") {
    return saveS3(buffer, subdir, filename);
  }

  return saveLocal(buffer, subdir, filename);
}