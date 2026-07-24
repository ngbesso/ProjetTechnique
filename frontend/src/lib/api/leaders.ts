// leaders.ts — client API public pour le module Corps de Leadership
import { http } from "./client";
import type { Leader, LeaderListResult, LeaderRole } from "../../types";

export interface LeaderQuery {
  role?: LeaderRole;
  district?: string;
  church_id?: number;
  limit?: number;
  offset?: number;
}

function buildQuery(query: LeaderQuery): string {
  const params = new URLSearchParams();
  if (query.role) params.set("role", query.role);
  if (query.district) params.set("district", query.district);
  if (query.church_id) params.set("church_id", String(query.church_id));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function getLeaders(query: LeaderQuery = {}): Promise<LeaderListResult> {
  return http.get<LeaderListResult>(`/api/leaders/${buildQuery(query)}`);
}

export function getLeader(id: number): Promise<Leader> {
  return http.get<Leader>(`/api/leaders/${id}`);
}
