// formations.ts
import { http } from "./client";
import type {
  Formation,
  FormationInput,
  FormationListResult,
  FormationRegistration,
  FormationRegistrationInput,
  MyFormationRegistration,
} from "../../types";

export function fetchFormations(params?: {
  q?: string;
  upcoming?: boolean;
  available?: boolean;
  limit?: number;
  offset?: number;
}): Promise<FormationListResult> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.upcoming) qs.set("upcoming", "true");
  if (params?.available) qs.set("available", "true");
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http.get<FormationListResult>(`/formations${suffix}`);
}

export function registerToFormation(
  id: number,
  data: FormationRegistrationInput,
): Promise<FormationRegistration> {
  return http.post<FormationRegistration>(`/formations/${id}/register`, data);
}

export function fetchFormationRegistrations(
  id: number,
): Promise<FormationRegistration[]> {
  return http.get<FormationRegistration[]>(`/formations/${id}/registrations`);
}

export function fetchMyFormationRegistrations(): Promise<MyFormationRegistration[]> {
  return http.get<MyFormationRegistration[]>("/formations/registrations/me");
}

export function fetchFormationsAdmin(params?: {
  q?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<FormationListResult> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http.get<FormationListResult>(`/formations/admin${suffix}`);
}

export function createFormation(data: FormationInput): Promise<Formation> {
  return http.post<Formation>("/formations", data);
}

export function updateFormation(
  id: number,
  data: Partial<FormationInput>,
): Promise<Formation> {
  return http.patch<Formation>(`/formations/${id}`, data);
}

export function deleteFormation(id: number): Promise<void> {
  return http.del(`/formations/${id}`);
}
