export const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

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
  const isMultipart = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isForm
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : isMultipart
        ? {}
        : { "Content-Type": "application/json" }),
    ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    let message = `HTTP ${res.status}`;
    if (body?.detail) {
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        // Erreurs de validation Pydantic : [{loc, msg, type}, ...]
        message = body.detail
          .map((d: { msg?: string; loc?: string[] }) => {
            const field = d.loc?.slice(1).join(" → ") ?? "";
            return field ? `${field} : ${d.msg ?? "invalide"}` : (d.msg ?? "invalide");
          })
          .join(" ; ");
      }
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function requestBlob(path: string): Promise<Blob> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: _token ? { Authorization: `Bearer ${_token}` } : {},
  });
  if (!res.ok) {
    throw new ApiError(res.status, `HTTP ${res.status}`);
  }
  return res.blob();
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
      request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  postForm: <T>(path: string, fields: Record<string, string>) =>
      request<T>(path, { method: "POST", body: new URLSearchParams(fields) }),
  postMultipart: <T>(path: string, formData: FormData) =>
      request<T>(path, { method: "POST", body: formData }),
  put: <T>(path: string, body: unknown) =>
      request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
      request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path: string) => request<void>(path, { method: "DELETE" }),
  getBlob: (path: string) => requestBlob(path),
};