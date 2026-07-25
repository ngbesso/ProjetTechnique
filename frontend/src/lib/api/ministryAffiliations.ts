import { http } from "./client";
import type { MinistryAffiliation, MinistryBulkAddResult, MinistryMember } from "../../types";

// ── Libre-service (membre connecté) ───────────────────────────────────────────

export function fetchMyMinistries(): Promise<MinistryAffiliation[]> {
    return http.get<MinistryAffiliation[]>("/members/me/ministries");
}

export function joinMinistry(ministry: string): Promise<MinistryAffiliation> {
    return http.post<MinistryAffiliation>("/members/me/ministries", { ministry });
}

export function leaveMinistry(affiliationId: number): Promise<MinistryAffiliation> {
    return http.del<MinistryAffiliation>(`/members/me/ministries/${affiliationId}`);
}

// ── Administration (centrée sur le ministère) ─────────────────────────────────

export function fetchMinistryMembers(ministry: string, q?: string): Promise<MinistryMember[]> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    return http.get<MinistryMember[]>(`/ministries/${encodeURIComponent(ministry)}/members${qs}`);
}

export function bulkAddMinistryMembers(
    ministry: string,
    memberIds: number[],
): Promise<MinistryBulkAddResult> {
    return http.post<MinistryBulkAddResult>(
        `/ministries/${encodeURIComponent(ministry)}/members`,
        { member_ids: memberIds },
    );
}

export function removeMinistryAffiliation(
    memberId: number,
    affiliationId: number,
): Promise<MinistryAffiliation> {
    return http.del<MinistryAffiliation>(`/members/${memberId}/ministries/${affiliationId}`);
}
