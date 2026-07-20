// prayerRequests.ts — client API pour les demandes de prière
import { http } from "./client";
import type {
  PrayerRequest,
  PrayerRequestAdmin,
  PrayerRequestInput,
  PrayerRequestStatus,
} from "../../types";

export function createPrayerRequest(data: PrayerRequestInput): Promise<PrayerRequest> {
  return http.post<PrayerRequest>("/prayer-requests", data);
}

export function fetchMyPrayerRequests(): Promise<PrayerRequest[]> {
  return http.get<PrayerRequest[]>("/prayer-requests/me");
}

export function fetchPrayerRequestsAdmin(
  status?: PrayerRequestStatus,
): Promise<PrayerRequestAdmin[]> {
  const qs = status ? `?status=${status}` : "";
  return http.get<PrayerRequestAdmin[]>(`/prayer-requests/admin${qs}`);
}

export function updatePrayerRequestStatus(
  id: number,
  status: PrayerRequestStatus,
): Promise<PrayerRequestAdmin> {
  return http.patch<PrayerRequestAdmin>(`/prayer-requests/${id}`, { status });
}
