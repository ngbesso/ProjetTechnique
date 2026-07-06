// members.ts
import { http } from "./client";
import type {Member, MemberListResult, MemberQuery, MemberSelfInput, MembershipInput} from "../../types";

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
export function requestMembership(data: MembershipInput): Promise<Member> {
    return http.post<Member>("/members/request", data);
}

export function fetchMyProfile(): Promise<Member> {
    return http.get<Member>("/members/me");
}
export function updateMyProfile(data: MemberSelfInput): Promise<Member> {
    return http.patch<Member>("/members/me", data);
}