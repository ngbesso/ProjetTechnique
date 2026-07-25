import { http, BASE_URL } from "./client";
import type { News, NewsInput, NewsListResult } from "../../types";

/** Construit l'URL absolue d'une couverture stockée en MinIO via le proxy backend. */
export function newsCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return url;
}

export function fetchNews(params?: {
  q?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<NewsListResult> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.category) qs.set("category", params.category);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http.get<NewsListResult>(`/news${suffix}`);
}

export function fetchNewsAdmin(params?: {
  q?: string;
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<NewsListResult> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.category) qs.set("category", params.category);
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http.get<NewsListResult>(`/news/admin${suffix}`);
}

export function fetchFeaturedNews(limit = 5): Promise<News[]> {
  return http.get<News[]>(`/news/featured?limit=${limit}`);
}

export function fetchNewsItem(id: number): Promise<News> {
  return http.get<News>(`/news/${id}`);
}

export function fetchNewsCategories(): Promise<string[]> {
  return http.get<string[]>("/news/categories");
}

export function createNews(data: NewsInput): Promise<News> {
  return http.post<News>("/news", data);
}

export function updateNews(id: number, data: Partial<NewsInput>): Promise<News> {
  return http.patch<News>(`/news/${id}`, data);
}

export function deleteNews(id: number): Promise<void> {
  return http.del(`/news/${id}`);
}

export function uploadNewsCover(id: number, file: File): Promise<News> {
  const fd = new FormData();
  fd.append("file", file);
  return http.postMultipart<News>(`/news/${id}/cover`, fd);
}

export function deleteNewsCover(id: number): Promise<void> {
  return http.del(`/news/${id}/cover`);
}
