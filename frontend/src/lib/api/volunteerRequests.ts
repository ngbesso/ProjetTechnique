// volunteerRequests.ts — client API pour les demandes de bénévolat
import { http } from "./client";
import type {
  VolunteerRequest,
  VolunteerRequestAdmin,
  VolunteerRequestInput,
  VolunteerRequestStatus,
} from "../../types";

export function createVolunteerRequest(
  data: VolunteerRequestInput,
): Promise<VolunteerRequest> {
  return http.post<VolunteerRequest>("/volunteer-requests", data);
}

export function fetchMyVolunteerRequests(): Promise<VolunteerRequest[]> {
  return http.get<VolunteerRequest[]>("/volunteer-requests/me");
}

export function fetchVolunteerRequestsAdmin(params?: {
  status?: VolunteerRequestStatus;
  event_id?: number;
}): Promise<VolunteerRequestAdmin[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.event_id) qs.set("event_id", String(params.event_id));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http.get<VolunteerRequestAdmin[]>(`/volunteer-requests/admin${suffix}`);
}

export function updateVolunteerRequestStatus(
  id: number,
  status: VolunteerRequestStatus,
): Promise<VolunteerRequestAdmin> {
  return http.patch<VolunteerRequestAdmin>(`/volunteer-requests/${id}`, { status });
}
