import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { fetchVolunteerRequestsAdmin, updateVolunteerRequestStatus } from "../../lib/api/volunteerRequests";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import type { VolunteerRequestAdmin, VolunteerRequestStatus } from "../../types";

const STATUS_LABELS: Record<VolunteerRequestStatus, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Refusée",
};

const STATUS_BADGE_CLASS: Record<VolunteerRequestStatus, string> = {
  pending: "badgePending",
  approved: "badgeActive",
  rejected: "badgeRejected",
};

const col = createColumnHelper<VolunteerRequestAdmin>();

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-CA", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function BenevolatPanel() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VolunteerRequestAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const canManage =
    user?.permissions.includes("*") || user?.permissions.includes("volunteer:manage");

  function load(status?: string) {
    setLoading(true);
    setError("");
    const s = status ?? filterStatus;
    fetchVolunteerRequestsAdmin({ status: (s || undefined) as VolunteerRequestStatus | undefined })
      .then(setRequests)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDecision(id: number, status: "approved" | "rejected") {
    try {
      await updateVolunteerRequestStatus(id, status);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Mise à jour impossible");
    }
  }

  const columns = [
    col.accessor("member_name", { header: "Membre" }),
    col.accessor("member_email", { header: "Courriel" }),
    col.accessor("event_title", { header: "Événement" }),
    col.accessor("message", {
      header: "Message",
      cell: (info) =>
        info.getValue() || <em style={{ color: "var(--text-muted)" }}>—</em>,
    }),
    col.accessor("created_at", {
      header: "Date",
      cell: (info) => formatDateTime(info.getValue()),
    }),
    col.accessor("status", {
      header: "Statut",
      cell: (info) => {
        const value = info.getValue();
        return (
          <span className={`${styles.badge} ${styles[STATUS_BADGE_CLASS[value]]}`}>
            {STATUS_LABELS[value]}
          </span>
        );
      },
    }),
    ...(canManage
      ? [
          col.display({
            id: "actions",
            header: "",
            cell: (info) => {
              const r = info.row.original;
              return r.status === "pending" ? (
                <div className={styles.actions}>
                  <button className={styles.btnPrimarySm} onClick={() => handleDecision(r.id, "approved")}>
                    Approuver
                  </button>
                  <button className={styles.btnDanger} onClick={() => handleDecision(r.id, "rejected")}>
                    Refuser
                  </button>
                </div>
              ) : null;
            },
          }),
        ]
      : []),
  ];

  if (loading) return <p className={styles.stateMsg}>Chargement…</p>;

  return (
    <div className={styles.rbacWrapper}>
      {error && <p className={styles.errorMsg} role="alert">{error}</p>}

      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>
            Demandes de bénévolat ({requests.length})
          </h3>
        </div>

        <div className={styles.filterBar}>
          <select
            className={styles.select}
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); load(e.target.value); }}
          >
            <option value="">Tous statuts</option>
            {(Object.keys(STATUS_LABELS) as VolunteerRequestStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className={styles.listBody}>
          <DataTable
            columns={columns}
            data={requests}
            getRowId={(r) => r.id}
            emptyMessage="Aucune demande de bénévolat."
          />
        </div>
      </section>
    </div>
  );
}
