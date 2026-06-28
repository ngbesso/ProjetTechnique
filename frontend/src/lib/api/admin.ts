import { http } from "./client";
import type { Permission, Role } from "../../types";

export async function fetchPermissions(): Promise<Permission[]> {
  return http.get<Permission[]>("/admin/permissions");
}

export async function fetchRoles(): Promise<Role[]> {
  return http.get<Role[]>("/admin/roles");
}

export async function createRole(name: string, description: string): Promise<Role> {
  return http.post<Role>("/admin/roles", { name, description });
}

export async function updateRolePermissions(roleId: number, codes: string[]): Promise<Role> {
  return http.put<Role>(`/admin/roles/${roleId}/permissions`, { codes });
}
