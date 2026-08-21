// import type { ApiResponse } from "@ksb/types";

// /**
//  * All requests go through /api and are proxied to the Express backend (see
//  * vite.config.ts in dev; same-origin behind one reverse proxy in prod). No
//  * component should call `fetch` directly — this is the single chokepoint so
//  * auth headers, error shape, and base URL only ever change in one place.
//  */

// let accessToken: string | null = null;

// export function setAccessToken(token: string | null) {
//   accessToken = token;
// }

// export function getAccessToken(): string | null {
//   return accessToken;
// }

// export class ApiClientError extends Error {
//   code: string;
//   status: number;
//   details?: Record<string, unknown>;

//   constructor(code: string, message: string, status: number, details?: Record<string, unknown>) {
//     super(message);
//     this.name = "ApiClientError";
//     this.code = code;
//     this.status = status;
//     this.details = details;
//   }
// }

// async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
//   const res = await fetch(`/api${path}`, {
//     ...init,
//     credentials: "include", // send the httpOnly refresh cookie
//     headers: {
//       "Content-Type": "application/json",
//       ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
//       ...init.headers,
//     },
//   });

//   const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;

//   if (!body) {
//     throw new ApiClientError("INTERNAL_ERROR", "The server returned an unexpected response.", res.status);
//   }
//   if (!body.success) {
//     throw new ApiClientError(body.error.code, body.error.message, res.status, body.error.details);
//   }
//   return body.data;
// }

// export const api = {
//   get: <T>(path: string) => request<T>(path, { method: "GET" }),
//   post: <T>(path: string, data?: unknown) =>
//     request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
//   put: <T>(path: string, data?: unknown) =>
//     request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
//   patch: <T>(path: string, data?: unknown) =>
//     request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
//   delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
// };

// /**
//  * For endpoints that return a binary body (PDF, audio) instead of the JSON
//  * envelope. A plain `<a href>` to one of these URLs would NOT carry the
//  * Authorization header — the API authenticates via bearer token, not a
//  * cookie, for anything other than the refresh endpoint — so an owner
//  * fetching their own private lesson's PDF would be treated as anonymous and
//  * incorrectly get a 404. This goes through the same accessToken as `api`,
//  * as a Blob, for the caller to trigger a real download from.
//  */
// export async function fetchBinary(path: string): Promise<Blob> {
//   const res = await fetch(`/api${path}`, {
//     credentials: "include",
//     headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
//   });
//   if (!res.ok) {
//     const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
//     const message =
//       body && !body.success ? body.error.message : `Download failed (${res.status}).`;
//     throw new ApiClientError(
//       body && !body.success ? body.error.code : "INTERNAL_ERROR",
//       message,
//       res.status,
//     );
//   }
//   return res.blob();
// }


import type { ApiResponse } from "@ksb/types";

/**
 * All requests go through /api and are proxied to the Express backend (see
 * vite.config.ts in dev; same-origin behind one reverse proxy in prod). No
 * component should call `fetch` directly — this is the single chokepoint so
 * auth headers, error shape, and base URL only ever change in one place.
 *
 * In production (Vercel), there is no proxy — the frontend is a static
 * site, so requests must go to the deployed backend's absolute URL instead.
 * VITE_API_URL is set as a Vercel environment variable and baked in at
 * build time. Locally, it's left unset so requests fall back to the
 * same-origin "/api" path, which Vite's dev server proxy forwards to
 * http://localhost:4000 (see vite.config.ts).
 */
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include", // send the httpOnly refresh cookie
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!body) {
    throw new ApiClientError("INTERNAL_ERROR", "The server returned an unexpected response.", res.status);
  }
  if (!body.success) {
    throw new ApiClientError(body.error.code, body.error.message, res.status, body.error.details);
  }
  return body.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/**
 * For endpoints that return a binary body (PDF, audio) instead of the JSON
 * envelope. A plain `<a href>` to one of these URLs would NOT carry the
 * Authorization header — the API authenticates via bearer token, not a
 * cookie, for anything other than the refresh endpoint — so an owner
 * fetching their own private lesson's PDF would be treated as anonymous and
 * incorrectly get a 404. This goes through the same accessToken as `api`,
 * as a Blob, for the caller to trigger a real download from.
 */
export async function fetchBinary(path: string): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
    const message =
      body && !body.success ? body.error.message : `Download failed (${res.status}).`;
    throw new ApiClientError(
      body && !body.success ? body.error.code : "INTERNAL_ERROR",
      message,
      res.status,
    );
  }
  return res.blob();
}