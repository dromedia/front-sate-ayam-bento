import { getStoredSession } from "./auth";

type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const publicApiBaseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL?.replace(/\/$/, "") ?? "";

function resolveRuntimeApiBaseUrl(): string {
  if (publicApiBaseUrl) {
    return publicApiBaseUrl;
  }

  if (typeof window === "undefined") {
    return "";
  }

  const { protocol, hostname, port } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "";
  }

  const normalizedHost = hostname.startsWith("www.")
    ? hostname.slice(4)
    : hostname;

  if (normalizedHost.startsWith("api.")) {
    return `${protocol}//${normalizedHost}${port ? `:${port}` : ""}/api`;
  }

  return `${protocol}//api.${normalizedHost}/api`;
}

function resolveApiUrl(path: string): string {
  const apiBaseUrl = resolveRuntimeApiBaseUrl();

  return apiBaseUrl ? `${apiBaseUrl}${path}` : `/api/backend${path}`;
}

async function requestApi<T>(path: string, method: ApiMethod, body?: unknown): Promise<T> {
  const session = getStoredSession();
  const headers: Record<string, string> = {};
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const response = await fetch(resolveApiUrl(path), {
    method,
    cache: "no-store",
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `API request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) {
        message = payload.message;
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to parse API error payload", error);
      }
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getApiData<T>(path: string): Promise<T> {
  return requestApi<T>(path, "GET");
}

export async function postApiData<T>(path: string, body: unknown): Promise<T> {
  return requestApi<T>(path, "POST", body);
}

export async function putApiData<T>(path: string, body: unknown): Promise<T> {
  return requestApi<T>(path, "PUT", body);
}

export async function patchApiData<T>(path: string, body: unknown): Promise<T> {
  return requestApi<T>(path, "PATCH", body);
}

export async function deleteApiData<T>(path: string): Promise<T> {
  return requestApi<T>(path, "DELETE");
}
