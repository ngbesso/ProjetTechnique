// useChurches.ts
import { useState, useCallback } from "react";
import type { Church, ChurchInput } from "../types";
import {
    fetchChurches, createChurch, updateChurch, deleteChurch,
} from "../lib/api/churches";

export function useChurches() {
    const [churches, setChurches] = useState<Church[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            setChurches(await fetchChurches());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    }, []);

    const add = useCallback(async (data: ChurchInput) => {
        const created = await createChurch(data);
        setChurches((prev) =>
            [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
    }, []);

    const edit = useCallback(async (id: number, data: Partial<ChurchInput>) => {
        const updated = await updateChurch(id, data);
        setChurches((prev) => prev.map((c) => (c.id === id ? updated : c)));
    }, []);

    const remove = useCallback(async (id: number) => {
        await deleteChurch(id);
        setChurches((prev) => prev.filter((c) => c.id !== id));
    }, []);

    return { churches, loading, error, load, add, edit, remove };
}