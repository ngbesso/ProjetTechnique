import { useCallback, useState } from "react";
import type { EventInput, EventItem, EventRegistration } from "../types";
import {
  createEvent,
  deleteEvent,
  getEventParticipants,
  getEventsAdmin,
  updateEvent,
  type EventAdminQuery,
} from "../lib/api/events";

export function useEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadAdmin = useCallback(async (params?: EventAdminQuery) => {
    setLoading(true);
    setError("");
    try {
      const res = await getEventsAdmin(params);
      setEvents(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  const add = useCallback(async (data: EventInput) => {
    const created = await createEvent(data);
    setEvents((prev) => [created, ...prev]);
    return created;
  }, []);

  const edit = useCallback(async (id: number, data: Partial<EventInput>) => {
    const updated = await updateEvent(id, data);
    setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const remove = useCallback(async (id: number) => {
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const [participants, setParticipants] = useState<EventRegistration[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const loadParticipants = useCallback(async (eventId: number) => {
    setParticipantsLoading(true);
    try {
      setParticipants(await getEventParticipants(eventId));
    } catch {
      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  }, []);

  return {
    events,
    total,
    loading,
    error,
    loadAdmin,
    add,
    edit,
    remove,
    participants,
    participantsLoading,
    loadParticipants,
  };
}
