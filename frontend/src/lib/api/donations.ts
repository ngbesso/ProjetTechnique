import { http } from "./client";
import type {
  Donation,
  DonationAdminStats,
  DonationCreate,
  DonationManualInput,
} from "../../types";

export function fetchDonationsStats(): Promise<DonationAdminStats> {
  return http.get<DonationAdminStats>("/api/donations/admin/stats");
}

export function createDonation(data: DonationCreate): Promise<Donation> {
  return http.post<Donation>("/api/donations/", data);
}

export function createManualDonation(data: DonationManualInput): Promise<Donation> {
  return http.post<Donation>("/api/donations/admin", data);
}

/** Complète ou corrige la catégorie d'un don après coup — utile pour les
 * dons reçus via le webhook Zeffy, qui n'en transmet pas à la création. */
export function updateDonationCategory(id: number, category: string): Promise<Donation> {
  return http.patch<Donation>(`/api/donations/${id}/category`, { category });
}

export function uploadDonationAttachment(id: number, file: File): Promise<Donation> {
  const fd = new FormData();
  fd.append("file", file);
  return http.postMultipart<Donation>(`/api/donations/${id}/attachment`, fd);
}

export function deleteDonationAttachment(id: number): Promise<void> {
  return http.del(`/api/donations/${id}/attachment`);
}

export function downloadDonationAttachment(id: number): Promise<Blob> {
  return http.getBlob(`/api/donations/${id}/attachment`);
}

export function fetchMyDonations(): Promise<Donation[]> {
  return http.get<Donation[]>("/api/donations/me");
}

export function fetchAllDonations(params?: {
  q?: string;
  payment_status?: string;
  category?: string;
  currency?: string;
}): Promise<Donation[]> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.payment_status) qs.set("payment_status", params.payment_status);
  if (params?.category) qs.set("category", params.category);
  if (params?.currency) qs.set("currency", params.currency);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http.get<Donation[]>(`/api/donations/${suffix}`);
}
