import { useCallback, useState } from "react";
import type { Leader, LeaderInput } from "../types";
import {
  createLeader,
  deleteLeader,
  getLeadersAdmin,
  updateLeader,
  uploadLeaderPhoto,
  type LeaderAdminQuery,
} from "../lib/api/leaders";
import { useAsyncList } from "./useAsyncList";

export function useLeaders() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [total, setTotal] = useState(0);
  const { loading, error, run } = useAsyncList();

  const loadAdmin = useCallback((params?: LeaderAdminQuery) => run(async () => {
    const res = await getLeadersAdmin(params);
    setLeaders(res.items);
    setTotal(res.total);
  }), [run]);

  const add = useCallback(async (data: LeaderInput) => {
    const created = await createLeader(data);
    setLeaders((prev) => [created, ...prev]);
    return created;
  }, []);

  const edit = useCallback(async (id: number, data: Partial<LeaderInput>) => {
    const updated = await updateLeader(id, data);
    setLeaders((prev) => prev.map((l) => (l.id === id ? updated : l)));
    return updated;
  }, []);

  const remove = useCallback(async (id: number) => {
    await deleteLeader(id);
    setLeaders((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const uploadPhoto = useCallback(async (id: number, file: File) => {
    const updated = await uploadLeaderPhoto(id, file);
    setLeaders((prev) => prev.map((l) => (l.id === id ? updated : l)));
    return updated;
  }, []);

  return { leaders, total, loading, error, loadAdmin, add, edit, remove, uploadPhoto };
}
