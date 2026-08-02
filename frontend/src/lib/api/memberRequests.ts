// memberRequests.ts — client API pour les demandes libres des membres
import { http } from "./client";
import type {
  MemberRequest,
  MemberRequestAdmin,
  MemberRequestAdminStats,
  MemberRequestInput,
  MemberRequestStatus,
} from "../../types";

export function createMemberRequest(data: MemberRequestInput): Promise<MemberRequest> {
  return http.post<MemberRequest>("/member-requests", data);
}

export function fetchMyMemberRequests(): Promise<MemberRequest[]> {
  return http.get<MemberRequest[]>("/member-requests/me");
}

export function fetchMemberRequestsAdmin(params?: {
  status?: MemberRequestStatus;
  request_type?: string;
}): Promise<MemberRequestAdmin[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.request_type) qs.set("request_type", params.request_type);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http.get<MemberRequestAdmin[]>(`/member-requests/admin${suffix}`);
}

export function fetchMemberRequestsStats(): Promise<MemberRequestAdminStats> {
  return http.get<MemberRequestAdminStats>("/member-requests/admin/stats");
}

export function updateMemberRequest(
  id: number,
  data: { status: MemberRequestStatus; admin_response?: string },
): Promise<MemberRequestAdmin> {
  return http.patch<MemberRequestAdmin>(`/member-requests/${id}`, data);
}
