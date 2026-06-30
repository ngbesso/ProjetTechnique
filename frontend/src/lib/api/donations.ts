import { http } from "./client";
import type { Donation, DonationCreate } from "../../types";

export function createDonation(data: DonationCreate): Promise<Donation> {
  return http.post<Donation>("/api/donations/", data);
}

export function fetchMyDonations(): Promise<Donation[]> {
  return http.get<Donation[]>("/api/donations/me");
}

export function fetchAllDonations(): Promise<Donation[]> {
  return http.get<Donation[]>("/api/donations/");
}
