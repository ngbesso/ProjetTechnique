// useChurches.ts
import { useState, useCallback } from "react";
import type { Church, ChurchInput, ChurchUpdateInput } from "../types";
import {
    fetchChurches, createChurch, updateChurch, deleteChurch,
} from "../lib/api/churches";
import { useAsyncList } from "./useAsyncList";

export function useChurches() {
    const [churches, setChurches] = useState<Church[]>([]);
    const { loading, error, run } = useAsyncList();

    const load = useCallback((opts?: { activeOnly?: boolean }) => run(async () => {
        setChurches(await fetchChurches(opts));
    }), [run]);

    const add = useCallback(async (data: ChurchInput) => {
        const created = await createChurch(data);
        setChurches((prev) =>
            [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
    }, []);

    const edit = useCallback(async (id: number, data: ChurchUpdateInput) => {
        const updated = await updateChurch(id, data);
        setChurches((prev) => prev.map((c) => (c.id === id ? updated : c)));
    }, []);

    const remove = useCallback(async (id: number) => {
        await deleteChurch(id);
        setChurches((prev) => prev.filter((c) => c.id !== id));
    }, []);

    return { churches, loading, error, load, add, edit, remove };
}