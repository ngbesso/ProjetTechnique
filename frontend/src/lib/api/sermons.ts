import { http, BASE_URL } from "./client";
import type { Sermon, SermonListResult, SermonInput } from "../../types";

export function fetchSermons(params?: {
  q?: string;
  series?: string;
  format?: string;
  limit?: number;
  offset?: number;
}): Promise<SermonListResult> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.series) qs.set("series", params.series);
  if (params?.format) qs.set("format", params.format);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http.get<SermonListResult>(`/sermons${suffix}`);
}

export function fetchSermonSeries(): Promise<string[]> {
  return http.get<string[]>("/sermons/series");
}

export function fetchSermon(id: number): Promise<Sermon> {
  return http.get<Sermon>(`/sermons/${id}`);
}

export function fetchSermonsAdmin(params?: {
  q?: string;
  status?: string;
  series?: string;
  format?: string;
  limit?: number;
  offset?: number;
}): Promise<SermonListResult> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.status) qs.set("status", params.status);
  if (params?.series) qs.set("series", params.series);
  if (params?.format) qs.set("format", params.format);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http.get<SermonListResult>(`/sermons/admin${suffix}`);
}

export function sermonStreamUrl(id: number): string {
  return `${BASE_URL}/sermons/${id}/stream`;
}

export function sermonAdminStreamUrl(id: number): string {
  return `${BASE_URL}/sermons/${id}/admin-stream`;
}

export function fetchSermonAdminMediaUrl(id: number): Promise<{ url: string; format: string }> {
  return http.get(`/sermons/${id}/admin-media-url`);
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

export function replaceSermonMedia(id: number, file: File): Promise<Sermon> {
  const fd = new FormData();
  fd.append("file", file);
  return http.postMultipart<Sermon>(`/sermons/${id}/media`, fd);
}

export function deleteSermon(id: number): Promise<void> {
  return http.del(`/sermons/${id}`);
}
