// events.ts — client API pour le module Événements
import { http } from "./client";
import type {
  EventInput,
  EventItem,
  EventListResult,
  EventRegistration,
  MyEventRegistration,
} from "../../types";

export interface EventQuery {
  district?: string;
  church_id?: number;
  upcoming_only?: boolean;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface EventAdminQuery extends EventQuery {
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

export function getEvents(query: EventQuery = {}): Promise<EventListResult> {
  return http.get<EventListResult>(`/api/events/${buildQuery(query)}`);
}

export function getEvent(id: number): Promise<EventItem> {
  return http.get<EventItem>(`/api/events/${id}`);
}

export function registerToEvent(id: number): Promise<EventRegistration> {
  return http.post<EventRegistration>(`/api/events/${id}/register`, {});
}

export function cancelRegistration(id: number): Promise<void> {
  return http.del(`/api/events/${id}/register`);
}

export function fetchMyEventRegistrations(): Promise<MyEventRegistration[]> {
  return http.get<MyEventRegistration[]>("/api/events/registrations/me");
}

// ── Administration ─────────────────────────────────────────────────────────

export function getEventsAdmin(query: EventAdminQuery = {}): Promise<EventListResult> {
  return http.get<EventListResult>(`/api/events/admin${buildQuery(query)}`);
}

export function createEvent(data: EventInput): Promise<EventItem> {
  return http.post<EventItem>("/api/events/", data);
}

export function updateEvent(id: number, data: Partial<EventInput>): Promise<EventItem> {
  return http.put<EventItem>(`/api/events/${id}`, data);
}

export function deleteEvent(id: number): Promise<void> {
  return http.del(`/api/events/${id}`);
}

export function getEventParticipants(id: number): Promise<EventRegistration[]> {
  return http.get<EventRegistration[]>(`/api/events/${id}/participants`);
}
