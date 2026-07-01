import { http } from "./client";
import type { UserAdmin, RoleAssignmentInput } from "../../types";

export function fetchUsers() { return http.get<UserAdmin[]>("/admin/users"); }
export function setUserActive(id: number, is_active: boolean) {
    return http.patch<UserAdmin>(`/admin/users/${id}`, { is_active });
}
export function assignRole(data: RoleAssignmentInput) {
    return http.post<{ status: string }>("/admin/role-assignments", data);
}
export function revokeRole(d: RoleAssignmentInput) {
    const qs = new URLSearchParams({
        user_id: String(d.user_id), role_id: String(d.role_id), church_id: String(d.church_id),
    }).toString();
    return http.del(`/admin/role-assignments?${qs}`);
}