import { useState, useCallback } from "react";
import type { UserAdmin, RoleAssignmentInput } from "../types";
import { fetchUsers, setUserActive, assignRole, revokeRole } from "../lib/api/users";

export function useUsers() {
    const [users, setUsers] = useState<UserAdmin[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            setUsers(await fetchUsers());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    }, []);

    const toggleActive = useCallback(async (id: number, is_active: boolean) => {
        const u = await setUserActive(id, is_active);
        setUsers((prev) => prev.map((x) => (x.id === id ? u : x)));
    }, []);

    const assign = useCallback(async (d: RoleAssignmentInput) => { await assignRole(d); await load(); }, [load]);
    const revoke = useCallback(async (d: RoleAssignmentInput) => { await revokeRole(d); await load(); }, [load]);

    return { users, loading, error, load, toggleActive, assign, revoke };
}