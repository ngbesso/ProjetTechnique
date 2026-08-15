import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { hasPermission, useAuth } from "../../context/AuthContext";
import {
  claimPrayerRequest,
  fetchPrayerRequestsAdmin,
  updatePrayerRequestStatus,
} from "../../lib/api/prayerRequests";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../lib/format";
import type { PrayerRequestAdmin, PrayerRequestStatus } from "../../types";

const STATUS_LABELS: Record<PrayerRequestStatus, string> = {
  new: "Nouvelle",
  handled: "Traitée",
};

const STATUS_BADGE_CLASS: Record<PrayerRequestStatus, string> = {
  new: "badgePending",
  handled: "badgeActive",
};

/** Filtre local sur la prise en charge (le backend ne filtre que par statut). */
type AssignmentFilter = "all" | "unassigned" | "mine";

const ASSIGNMENT_LABELS: Record<AssignmentFilter, string> = {
  all: "Toutes",
  unassigned: "Non prises en charge",
  mine: "Les miennes",
};

const col = createColumnHelper<PrayerRequestAdmin>();

export function PrieresPanel() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PrayerRequestAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [assignment, setAssignment] = useState<AssignmentFilter>("all");
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const { toast, toasts } = useToast();

  const canManage = hasPermission(user, "prayer:manage");

  function load(status?: string) {
    setLoading(true);
    setError("");
    const s = status ?? filterStatus;
    fetchPrayerRequestsAdmin((s || undefined) as PrayerRequestStatus | undefined)
      .then(setRequests)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleMarkHandled(id: number) {
    try {
      await updatePrayerRequestStatus(id, "handled");
      load();
      toast.success("Demande marquée comme traitée.");
    } catch (err) {
      toast.error(err, "Mise à jour impossible.");
    }
  }

  async function handleClaim(id: number) {
    setClaimingId(id);
    try {
      await claimPrayerRequest(id);
      load();
      toast.success("Demande prise en charge.");
    } catch (err) {
      toast.error(err, "Prise en charge impossible.");
    } finally {
      setClaimingId(null);
    }
  }

  const visibleRequests = requests.filter((r) => {
    if (assignment === "unassigned") return r.handled_by === null;
    if (assignment === "mine") return r.handled_by === user?.id;
    return true;
  });

  const columns = [
    col.accessor("member_name", { header: "Membre" }),
    col.accessor("member_email", { header: "Courriel" }),
    col.accessor("message", {
      header: "Message",
      cell: (info) => <span style={{ whiteSpace: "pre-wrap" }}>{info.getValue()}</span>,
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
    col.display({
      id: "handled_by",
      header: "Prise en charge",
      cell: (info) => {
        const r = info.row.original;
        if (!r.handled_by_email) {
          return <span style={{ color: "var(--text-muted)" }}>Non assignée</span>;
        }
        return (
          <>
            <div>{r.handled_by_email}</div>
            {r.handled_at && (
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {formatDateTime(r.handled_at)}
              </div>
            )}
          </>
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
              return (
                <div className={styles.actions}>
                  {r.handled_by === null && (
                    <button
                      className={styles.btnOutlineSm}
                      disabled={claimingId === r.id}
                      onClick={() => handleClaim(r.id)}
                    >
                      {claimingId === r.id ? "…" : "Je m'en occupe"}
                    </button>
                  )}
                  {r.status === "new" && (
                    <button className={styles.btnPrimarySm} onClick={() => handleMarkHandled(r.id)}>
                      Marquer traitée
                    </button>
                  )}
                </div>
              );
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
            Demandes de prière ({visibleRequests.length})
          </h3>
        </div>

        <div className={styles.filterBar}>
          <select
            className={styles.select}
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); load(e.target.value); }}
          >
            <option value="">Tous statuts</option>
            {(Object.keys(STATUS_LABELS) as PrayerRequestStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={assignment}
            onChange={(e) => setAssignment(e.target.value as AssignmentFilter)}
          >
            {(Object.keys(ASSIGNMENT_LABELS) as AssignmentFilter[]).map((a) => (
              <option key={a} value={a}>{ASSIGNMENT_LABELS[a]}</option>
            ))}
          </select>
        </div>

        <div className={styles.listBody}>
          <DataTable
            columns={columns}
            data={visibleRequests}
            getRowId={(r) => r.id}
            emptyMessage="Aucune demande de prière."
          />
        </div>
      </section>
      {toasts}
    </div>
  );
}
