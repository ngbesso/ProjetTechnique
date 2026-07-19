// members.ts
import { http, BASE_URL, getToken, ApiError } from "./client";
import type {Member, MemberImportResult, MemberListResult, MemberQuery, MemberSelfInput, MemberStatusStats, MemberUpdateInput, MembershipInput} from "../../types";

export function fetchMembersStats(): Promise<MemberStatusStats> {
    return http.get<MemberStatusStats>("/members/admin/stats");
}

export function fetchMembers(query: MemberQuery = {}): Promise<MemberListResult> {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.status) params.set("status", query.status);
    if (query.limit != null) params.set("limit", String(query.limit));
    if (query.offset != null) params.set("offset", String(query.offset));
    const qs = params.toString();
    return http.get<MemberListResult>(`/members${qs ? `?${qs}` : ""}`);
}

export function approveMember(id: number): Promise<Member> {
    return http.post<Member>(`/members/${id}/approve`, {});
}

export function rejectMember(id: number): Promise<Member> {
    return http.post<Member>(`/members/${id}/reject`, {});
}

export function deactivateMember(id: number): Promise<Member> {
    return http.post<Member>(`/members/${id}/deactivate`, {});
}

export function activateMember(id: number): Promise<Member> {
    return http.post<Member>(`/members/${id}/activate`, {});
}

export function updateMember(id: number, data: MemberUpdateInput): Promise<Member> {
    return http.patch<Member>(`/members/${id}`, data);
}
export function requestMembership(data: MembershipInput): Promise<Member> {
    return http.post<Member>("/members/request", data);
}

export function importMembers(churchId: number, file: File): Promise<MemberImportResult> {
    const fd = new FormData();
    fd.append("church_id", String(churchId));
    fd.append("file", file);
    return http.postMultipart<MemberImportResult>("/members/import", fd);
}

export async function downloadImportTemplate(): Promise<void> {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/members/import/template`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "Impossible de télécharger le modèle.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele-import-membres.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function fetchMyProfile(): Promise<Member> {
    return http.get<Member>("/members/me");
}
export function updateMyProfile(data: MemberSelfInput): Promise<Member> {
    return http.patch<Member>("/members/me", data);
}