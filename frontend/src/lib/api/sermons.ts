import { http, BASE_URL } from "./client";
import type { Sermon, SermonListResult, SermonInput } from "../../types";

export function fetchSermons(params?: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<SermonListResult> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http.get<SermonListResult>(`/sermons${suffix}`);
}

export function fetchSermon(id: number): Promise<Sermon> {
  return http.get<Sermon>(`/sermons/${id}`);
}

export function fetchSermonsAdmin(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<SermonListResult> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http.get<SermonListResult>(`/sermons/admin${suffix}`);
}

export function sermonStreamUrl(id: number): string {
  return `${BASE_URL}/sermons/${id}/stream`;
}

export function createSermon(data: SermonInput, file: File): Promise<Sermon> {
  const fd = new FormData();
  fd.append("title", data.title);
  fd.append("preacher", data.preacher);
  fd.append("sermon_date", data.sermon_date);
  if (data.description) fd.append("description", data.description);
  if (data.series) fd.append("series", data.series);
  if (data.status) fd.append("status", data.status);
  fd.append("file", file);
  return http.postMultipart<Sermon>("/sermons", fd);
}

export function updateSermon(id: number, data: Partial<SermonInput>): Promise<Sermon> {
  return http.patch<Sermon>(`/sermons/${id}`, data);
}

export function deleteSermon(id: number): Promise<void> {
  return http.del(`/sermons/${id}`);
}
