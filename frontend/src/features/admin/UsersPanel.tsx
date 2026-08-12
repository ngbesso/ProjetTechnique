import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useUsers } from "../../hooks/useUsers";
import { useRbac } from "../../hooks/useRbac";
import { useChurches } from "../../hooks/useChurches";
import { DataTable } from "../../components/ui/DataTable";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { AssignRoleCard } from "./utilisateurs/AssignRoleCard";
import { CreateAccountCard } from "./utilisateurs/CreateAccountCard";
import { UserFilters } from "./utilisateurs/UserFilters";
import { NO_USER_CRITERIA, filterUsers } from "./utilisateurs/userFilter";
import { userColumns } from "./utilisateurs/userColumns";
import type { UserCriteria } from "./utilisateurs/userFilter";
import type { AssignmentRead, UserAdmin } from "../../types";

export function UsersPanel() {
  const { users, loading, error, load, toggleActive, assign, revoke, create } = useUsers();
  const { roles, load: loadRbac } = useRbac();
  const { churches, load: loadChurches } = useChurches();
  const { confirm, dialog } = useConfirm();
  const { toast, toasts } = useToast();

  const [criteria, setCriteria] = useState<UserCriteria>(NO_USER_CRITERIA);

  useEffect(() => { load(); loadRbac(); loadChurches(); }, [load, loadRbac, loadChurches]);

  /** Retrait d'un rôle : confirmé, comme toute action destructrice. */
  async function handleRevoke(u: UserAdmin, a: AssignmentRead) {
    const ok = await confirm({
      title: `Retirer le rôle « ${a.role} » à ${u.email} ?`,
      description: `La portée concernée est « ${a.church_name} ».`,
      confirmLabel: "Retirer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await revoke({ user_id: u.id, role_id: a.role_id, church_id: a.church_id });
      toast.success(`Rôle « ${a.role} » retiré à ${u.email}.`);
    } catch (err) {
      toast.error(err, "Retrait impossible.");
    }
  }

  async function handleToggleActive(u: UserAdmin) {
    const action = u.is_active ? "Désactiver" : "Réactiver";
    const ok = await confirm({
      title: `${action} le compte ${u.email} ?`,
      variant: u.is_active ? "danger" : "default",
      confirmLabel: action,
    });
    if (!ok) return;
    try {
      await toggleActive(u.id, !u.is_active);
      toast.success(u.is_active ? "Compte désactivé." : "Compte réactivé.");
    } catch (err) {
      toast.error(err, "Opération impossible.");
    }
  }

  const filteredUsers = filterUsers(users, criteria);

  return (
    <>
      <CreateAccountCard create={create} toast={toast} />

      <AssignRoleCard
        users={users}
        roles={roles}
        churches={churches}
        assign={assign}
        toast={toast}
      />

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Utilisateurs ({filteredUsers.length})</h3>

        <UserFilters onChange={setCriteria} />

        {loading ? (
          <p className={styles.stateMsg}>Chargement…</p>
        ) : error ? (
          <p className={styles.errorMsg} role="alert">{error}</p>
        ) : (
          <DataTable
            columns={userColumns({ onRevoke: handleRevoke, onToggleActive: handleToggleActive })}
            data={filteredUsers}
            getRowId={(u) => u.id}
            emptyMessage="Aucun utilisateur."
          />
        )}
      </section>
      {dialog}
      {toasts}
    </>
  );
}
