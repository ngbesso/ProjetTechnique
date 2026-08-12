import { useCallback, useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { hasPermission, useAuth } from "../../context/AuthContext";
import { useUsers } from "../../hooks/useUsers";
import { useRbac } from "../../hooks/useRbac";
import { useChurches } from "../../hooks/useChurches";
import { DataTable } from "../../components/ui/DataTable";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { IconCalendar, IconCheckCircle, IconXCircle } from "../../components/ui/icons";
import { KpiCard } from "../../components/ui/KpiCard";
import { fetchOrganisateursStats } from "../../lib/api/users";
import { AssignOrganiserCard } from "./organisateurs/AssignOrganiserCard";
import { CreateOrganiserCard } from "./organisateurs/CreateOrganiserCard";
import { organiserColumns } from "./organisateurs/organiserColumns";
import {
  ROLE_NAME,
  candidateAccounts,
  organiserStats,
  toOrganiserRows,
} from "./organisateurs/organiserRows";
import type { OrganiserRow } from "./organisateurs/organiserRows";
import type { OrganiserEventCount } from "../../types";

export function OrganisateursPanel() {
  const { user } = useAuth();
  const { users, loading, error, load, toggleActive, assign, revoke, create } = useUsers();
  const { roles, load: loadRbac } = useRbac();
  const { churches, load: loadChurches } = useChurches();
  const { confirm, dialog } = useConfirm();
  const { toast, toasts } = useToast();

  const [eventCounts, setEventCounts] = useState<OrganiserEventCount[]>([]);
  const [filterQ, setFilterQ] = useState("");

  const canManage = hasPermission(user, "user:manage") && hasPermission(user, "rbac:manage");

  const loadCounts = useCallback(() => {
    fetchOrganisateursStats().then(setEventCounts).catch(() => setEventCounts([]));
  }, []);

  useEffect(() => {
    load();
    loadRbac();
    loadChurches();
    loadCounts();
  }, [load, loadRbac, loadChurches, loadCounts]);

  const organisateurRole = roles.find((r) => r.name === ROLE_NAME);
  const organisers = toOrganiserRows(users, eventCounts);
  const stats = organiserStats(organisers);
  const visibleOrganisers = organisers.filter(
    (o) => !filterQ || o.email.toLowerCase().includes(filterQ.toLowerCase()),
  );

  async function handleRevoke(row: OrganiserRow) {
    if (!organisateurRole) return;
    const ok = await confirm({
      title: `Retirer le rôle organisateur à ${row.email} ?`,
      description: `La portée concernée est « ${row.assignment.church_name} ». Les événements déjà créés sont conservés.`,
      confirmLabel: "Retirer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await revoke({
        user_id: row.id,
        role_id: organisateurRole.id,
        church_id: row.assignment.church_id,
      });
      loadCounts();
      toast.success(`Rôle organisateur retiré à ${row.email}.`);
    } catch (err) {
      toast.error(err, "Retrait impossible.");
    }
  }

  return (
    <div className={styles.rbacWrapper}>
      <div className={styles.kpiGrid}>
        <KpiCard color="violet" icon={<IconCheckCircle />} value={stats.total} label="Organisateurs" />
        <KpiCard color="emerald" icon={<IconCheckCircle />} value={stats.active} label="Actifs" />
        <KpiCard color="rose" icon={<IconXCircle />} value={stats.inactive} label="Désactivés" />
        <KpiCard color="amber" icon={<IconCalendar />} value={stats.totalEvents} label="Événements créés" />
      </div>

      {canManage && (
        <>
          <CreateOrganiserCard
            users={users}
            churches={churches}
            roleId={organisateurRole?.id}
            create={create}
            assign={assign}
            onChanged={loadCounts}
            toast={toast}
          />
          <AssignOrganiserCard
            candidates={candidateAccounts(users)}
            churches={churches}
            roleId={organisateurRole?.id}
            assign={assign}
            onChanged={loadCounts}
            toast={toast}
          />
        </>
      )}

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Organisateurs ({visibleOrganisers.length})</h3>

        <div className={styles.inlineForm} style={{ flexWrap: "wrap", marginBottom: "1rem", gap: "0.5rem" }}>
          <input
            className={styles.input}
            placeholder="Rechercher par courriel…"
            value={filterQ}
            style={{ flex: "1 1 200px" }}
            onChange={(e) => setFilterQ(e.target.value)}
          />
        </div>

        {loading ? (
          <p className={styles.stateMsg}>Chargement…</p>
        ) : error ? (
          <p className={styles.errorMsg} role="alert">{error}</p>
        ) : (
          <DataTable
            columns={organiserColumns({
              canManage,
              onToggleActive: toggleActive,
              onRevoke: handleRevoke,
            })}
            data={visibleOrganisers}
            getRowId={(o) => `${o.id}-${o.assignment.church_id}`}
            emptyMessage="Aucun organisateur."
          />
        )}
      </section>
      {dialog}
      {toasts}
    </div>
  );
}
