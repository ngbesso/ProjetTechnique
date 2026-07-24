// leaders.ts — client API pour le module Corps de Leadership
import { http } from "./client";
import type { Leader, LeaderInput, LeaderListResult, LeaderRole } from "../../types";

export interface LeaderQuery {
  role?: LeaderRole;
  district?: string;
  church_id?: number;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface LeaderAdminQuery extends LeaderQuery {
  q?: string;
  is_published?: boolean;
}

function buildQuery(query: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// ── Public ─────────────────────────────────────────────────────────────────

export function getLeaders(query: LeaderQuery = {}): Promise<LeaderListResult> {
  return http.get<LeaderListResult>(`/api/leaders/${buildQuery(query)}`);
}

export function getLeader(id: number): Promise<Leader> {
  return http.get<Leader>(`/api/leaders/${id}`);
}

// ── Administration ─────────────────────────────────────────────────────────

export function getLeadersAdmin(query: LeaderAdminQuery = {}): Promise<LeaderListResult> {
  return http.get<LeaderListResult>(`/api/leaders/admin${buildQuery(query)}`);
}

export function createLeader(data: LeaderInput): Promise<Leader> {
  return http.post<Leader>("/api/leaders/", data);
}

export function updateLeader(id: number, data: Partial<LeaderInput>): Promise<Leader> {
  return http.put<Leader>(`/api/leaders/${id}`, data);
}

export function deleteLeader(id: number): Promise<void> {
  return http.del(`/api/leaders/${id}`);
}

export function uploadLeaderPhoto(id: number, file: File): Promise<Leader> {
  const fd = new FormData();
  fd.append("file", file);
  return http.postMultipart<Leader>(`/api/leaders/${id}/photo`, fd);
}
