import { useState, useCallback } from "react";
import type { Formation, FormationInput } from "../types";
import {
  fetchFormations,
  fetchFormationsAdmin,
  createFormation,
  updateFormation,
  deleteFormation,
} from "../lib/api/formations";

export function useFormations() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (params?: { q?: string; upcoming?: boolean; available?: boolean; limit?: number; offset?: number }) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchFormations(params);
        setFormations(res.items);
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
    async (params?: { q?: string; status?: string; limit?: number; offset?: number }) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchFormationsAdmin(params);
        setFormations(res.items);
        setTotal(res.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const add = useCallback(async (data: FormationInput) => {
    const created = await createFormation(data);
    setFormations((prev) => [created, ...prev]);
    return created;
  }, []);

  const edit = useCallback(async (id: number, data: Partial<FormationInput>) => {
    const updated = await updateFormation(id, data);
    setFormations((prev) => prev.map((f) => (f.id === id ? updated : f)));
    return updated;
  }, []);

  const remove = useCallback(async (id: number) => {
    await deleteFormation(id);
    setFormations((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return { formations, total, loading, error, load, loadAdmin, add, edit, remove };
}
