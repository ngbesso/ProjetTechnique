import { useState, useCallback } from "react";
import type { Role, Permission } from "../types";
import {
  fetchRoles,
  fetchPermissions,
  createRole,
  updateRolePermissions,
} from "../lib/api/admin";

interface UseRbacReturn {
  roles: Role[];
  permissions: Permission[];
  loading: boolean;
  error: string;
  load: () => Promise<void>;
  addRole: (name: string, description: string) => Promise<Role>;
  saveRolePermissions: (roleId: number, codes: string[]) => Promise<Role>;
}

export function useRbac(): UseRbacReturn {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rolesData, permsData] = await Promise.all([
        fetchRoles(),
        fetchPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  const addRole = useCallback(
    async (name: string, description: string): Promise<Role> => {
      const role = await createRole(name, description);
      setRoles((prev) => [...prev, role]);
      return role;
    },
    [],
  );

  const saveRolePermissions = useCallback(
    async (roleId: number, codes: string[]): Promise<Role> => {
      const updated = await updateRolePermissions(roleId, codes);
      setRoles((prev) =>
        prev.map((r) => (r.id === roleId ? updated : r)),
      );
      return updated;
    },
    [],
  );

  return {
    roles,
    permissions,
    loading,
    error,
    load,
    addRole,
    saveRolePermissions,
  };
}
