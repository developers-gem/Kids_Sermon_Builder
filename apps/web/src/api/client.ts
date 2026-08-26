import type { ApiResponse } from "@ksb/types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";
const ACCESS_TOKEN_KEY = "accessToken";

// Instantly initialize from localStorage so requests on page load don't race
let accessToken: string | null =
  typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;

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

  constructor(
    code: string,
    message: string,
    status: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const currentToken =
    accessToken ||
    (typeof window !== "undefined"
      ? localStorage.getItem(ACCESS_TOKEN_KEY)
      : null);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include", // send cookies if available
    headers: {
      "Content-Type": "application/json",
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      ...init.headers,
    },
  });

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!body) {
    throw new ApiClientError(
      "INTERNAL_ERROR",
      "The server returned an unexpected response.",
      res.status
    );
  }
  if (!body.success) {
    throw new ApiClientError(
      body.error.code,
      body.error.message,
      res.status,
      body.error.details
    );
  }
  return body.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export async function fetchBinary(path: string): Promise<Blob> {
  const currentToken =
    accessToken ||
    (typeof window !== "undefined"
      ? localStorage.getItem(ACCESS_TOKEN_KEY)
      : null);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
  });
  if (!res.ok) {
    const body = (await res
      .json()
      .catch(() => null)) as ApiResponse<unknown> | null;
    const message =
      body && !body.success
        ? body.error.message
        : `Download failed (${res.status}).`;
    throw new ApiClientError(
      body && !body.success ? body.error.code : "INTERNAL_ERROR",
      message,
      res.status
    );
  }
  return res.blob();
}