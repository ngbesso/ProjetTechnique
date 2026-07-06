import { http } from "./client";
import type { Donation, DonationCreate } from "../../types";

export function createDonation(data: DonationCreate): Promise<Donation> {
  return http.post<Donation>("/api/donations/", data);
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
