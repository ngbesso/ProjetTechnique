import { useState, useCallback } from "react";
import type { Sermon, SermonInput } from "../types";
import {
  fetchSermons,
  fetchSermonsAdmin,
  createSermon,
  updateSermon,
  deleteSermon,
} from "../lib/api/sermons";

export function useSermons() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (params?: { q?: string; limit?: number; offset?: number }) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchSermons(params);
        setSermons(res.items);
        setTotal(res.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadAdmin = useCallback(
    async (params?: { status?: string; limit?: number; offset?: number }) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchSermonsAdmin(params);
        setSermons(res.items);
        setTotal(res.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const add = useCallback(async (data: SermonInput, file: File) => {
    const created = await createSermon(data, file);
    setSermons((prev) => [created, ...prev]);
    return created;
  }, []);

  const edit = useCallback(async (id: number, data: Partial<SermonInput>) => {
    const updated = await updateSermon(id, data);
    setSermons((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  }, []);

  const remove = useCallback(async (id: number) => {
    await deleteSermon(id);
    setSermons((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { sermons, total, loading, error, load, loadAdmin, add, edit, remove };
}
