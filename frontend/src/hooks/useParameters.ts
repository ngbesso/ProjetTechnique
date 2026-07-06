import { useCallback, useState } from "react";
import type { ParameterValue } from "../types";
import {
    createParameterValue,
    deleteParameterValue,
    fetchParameters,
    updateParameterValue,
} from "../lib/api/parameters";

export function useParameters(category: string) {
    const [values, setValues] = useState<ParameterValue[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchParameters(category);
            setValues(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    }, [category]);

    async function add(label: string) {
        const next = values.length;
        const created = await createParameterValue(category, label, next);
        setValues((prev) => [...prev, created]);
    }

    async function rename(id: number, label: string) {
        const updated = await updateParameterValue(id, { label });
        setValues((prev) => prev.map((v) => (v.id === id ? updated : v)));
    }

    async function remove(id: number) {
        await deleteParameterValue(id);
        setValues((prev) => prev.filter((v) => v.id !== id));
    }

    return { values, loading, error, load, add, rename, remove };
}
