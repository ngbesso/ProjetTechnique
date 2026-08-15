import { http, BASE_URL } from "./client";
import type { MenuItem, MenuItemInput } from "../../types";

/** Construit l'URL absolue du logo du site stocké en MinIO via le proxy backend. */
export function siteLogoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return url;
}

export function uploadSiteLogo(file: File): Promise<{ site_logo_url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  return http.postMultipart<{ site_logo_url: string }>("/content/logo", fd);
}

export function deleteSiteLogo(): Promise<void> {
  return http.del("/content/logo");
}

export function fetchMenu(): Promise<MenuItem[]> {
  return http.get<MenuItem[]>("/content/menu");
}

export function fetchMenuAdmin(): Promise<MenuItem[]> {
  return http.get<MenuItem[]>("/content/menu/admin");
}

export function createMenuItem(data: MenuItemInput): Promise<MenuItem> {
  return http.post<MenuItem>("/content/menu", data);
}

export function updateMenuItem(id: number, data: MenuItemInput): Promise<MenuItem> {
  return http.patch<MenuItem>(`/content/menu/${id}`, data);
}

export function deleteMenuItem(id: number): Promise<void> {
  return http.del(`/content/menu/${id}`);
}
