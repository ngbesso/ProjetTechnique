const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

let _token: string | null = localStorage.getItem("access_token");

export function setToken(t: string | null): void {
  _token = t;
  if (t) localStorage.setItem("access_token", t);
  else localStorage.removeItem("access_token");
}

export function getToken(): string | null {
  return _token;
}

export class ApiError extends Error {
  constructor(
      public status: number,
      message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = options.body instanceof URLSearchParams;
  const headers: Record<string, string> = {
    ...(isForm
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : { "Content-Type": "application/json" }),
    ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new ApiError(res.status, err.detail ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
      request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  postForm: <T>(path: string, fields: Record<string, string>) =>
      request<T>(path, { method: "POST", body: new URLSearchParams(fields) }),
  put: <T>(path: string, body: unknown) =>
      request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
      request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path: string) => request<void>(path, { method: "DELETE" }),
};