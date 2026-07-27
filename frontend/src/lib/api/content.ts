import { http } from "./client";
import type { MenuItem, MenuItemInput } from "../../types";

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
