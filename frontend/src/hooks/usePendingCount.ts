import { useState, useEffect, useCallback } from "react";
import { fetchMembers } from "../lib/api/members";

export function usePendingCount(intervalMs = 30_000) {
    const [count, setCount] = useState(0);

    const refresh = useCallback(async () => {
        try {
            const data = await fetchMembers({ status: "pending", limit: 1 });
            setCount(data.total);
        } catch {
            // erreur silencieuse — non bloquante
        }
    }, []);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, intervalMs);
        return () => clearInterval(id);
    }, [refresh, intervalMs]);

    return { count, refresh };
}
