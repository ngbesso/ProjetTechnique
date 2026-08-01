import { http } from "./client";
import type { Donor } from "../../types";

export function searchDonors(q?: string): Promise<Donor[]> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return http.get<Donor[]>(`/api/donors/${qs}`);
}

export function createDonor(data: { name: string; email?: string }): Promise<Donor> {
  return http.post<Donor>("/api/donors/", data);
}
