import { http, BASE_URL } from "./client";
import type { Post, PostAdminStats, PostInput, PostListResult } from "../../types";

export function fetchPostsStats(): Promise<PostAdminStats> {
  return http.get<PostAdminStats>("/posts/admin/stats");
}

/** Construit l'URL absolue d'une couverture stockée en MinIO via le proxy backend. */
export function coverUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return url;
}

export function fetchPosts(params?: {
  q?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<PostListResult> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.category) qs.set("category", params.category);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http.get<PostListResult>(`/posts${suffix}`);
}

export function fetchPostsAdmin(params?: {
  q?: string;
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<PostListResult> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.category) qs.set("category", params.category);
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http.get<PostListResult>(`/posts/admin${suffix}`);
}

export function fetchPost(id: number): Promise<Post> {
  return http.get<Post>(`/posts/${id}`);
}

export function fetchPostCategories(): Promise<string[]> {
  return http.get<string[]>("/posts/categories");
}

export function createPost(data: PostInput): Promise<Post> {
  return http.post<Post>("/posts", data);
}

export function updatePost(id: number, data: Partial<PostInput>): Promise<Post> {
  return http.patch<Post>(`/posts/${id}`, data);
}

export function deletePost(id: number): Promise<void> {
  return http.del(`/posts/${id}`);
}

export function uploadPostCover(id: number, file: File): Promise<Post> {
  const fd = new FormData();
  fd.append("file", file);
  return http.postMultipart<Post>(`/posts/${id}/cover`, fd);
}

export function deletePostCover(id: number): Promise<void> {
  return http.del(`/posts/${id}/cover`);
}
