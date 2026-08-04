import { useCallback, useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { hasPermission, useAuth } from "../../context/AuthContext";
import { useParameters } from "../../hooks/useParameters";
import { useToast } from "../../hooks/useToast";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import { IconCheckCircle, IconFileEdit } from "../../components/ui/icons";
import { KpiCard } from "../../components/ui/KpiCard";
import {
  fetchMemberRequestsAdmin,
  fetchMemberRequestsStats,
  updateMemberRequest,
} from "../../lib/api/memberRequests";
import { formatDate } from "../../lib/format";
import type {
  MemberRequestAdmin,
  MemberRequestAdminStats,
  MemberRequestStatus,
} from "../../types";

const STATUS_LABELS: Record<MemberRequestStatus, string> = {
  new: "Nouvelle",
  in_progress: "En cours",
  resolved: "Résolue",
};

const STATUS_BADGE_CLASS: Record<MemberRequestStatus, string> = {
  new: "badgePending",
  in_progress: "badgeInactive",
  resolved: "badgeActive",
};

function IconInbox() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

const col = createColumnHelper<MemberRequestAdmin>();

export function DemandesMembresPanel() {
  const { user } = useAuth();
  const { values: types, load: loadTypes } = useParameters("member_request_type");
  const [requests, setRequests] = useState<MemberRequestAdmin[]>([]);
  const [stats, setStats] = useState<MemberRequestAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  // Demande en cours de traitement dans la modale de réponse.
  const [editing, setEditing] = useState<MemberRequestAdmin | null>(null);
  const [response, setResponse] = useState("");
  const [nextStatus, setNextStatus] = useState<MemberRequestStatus>("resolved");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const canManage = hasPermission(user, "member_request:manage");
  const { toast, toasts } = useToast();

  const load = useCallback(
    (overrides?: { status?: string; request_type?: string }) => {
      setLoading(true);
      setError("");
      const status = overrides?.status ?? filterStatus;
      const requestType = overrides?.request_type ?? filterType;
      fetchMemberRequestsAdmin({
        status: (status || undefined) as MemberRequestStatus | undefined,
        request_type: requestType || undefined,
      })
        .then(setRequests)
        .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
        .finally(() => setLoading(false));
      fetchMemberRequestsStats().then(setStats).catch(() => {});
    },
    [filterStatus, filterType],
  );

  useEffect(() => {
    loadTypes();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTypes]);

  function openEditor(r: MemberRequestAdmin) {
    setEditing(r);
    setResponse(r.admin_response ?? "");
    setNextStatus(r.status === "resolved" ? "resolved" : "in_progress");
    setSaveError("");
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setSaveError("");
    try {
      await updateMemberRequest(editing.id, {
        status: nextStatus,
        admin_response: response.trim() || undefined,
      });
      setEditing(null);
      load();
      toast.success("Demande mise à jour.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Enregistrement impossible");
      toast.error(err, "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    col.accessor("member_name", { header: "Membre" }),
    col.accessor("member_email", { header: "Courriel" }),
    col.accessor("request_type", { header: "Type" }),
    col.accessor("message", {
      header: "Message",
      cell: (info) => <span style={{ whiteSpace: "pre-wrap" }}>{info.getValue()}</span>,
    }),
    col.accessor("created_at", {
      header: "Reçue le",
      cell: (info) => formatDate(info.getValue()),
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
      id: "response",
      header: "Réponse",
      cell: (info) => {
        const r = info.row.original;
        if (!r.admin_response) {
          return <span style={{ color: "var(--text-muted)" }}>—</span>;
        }
        return (
          <>
            <div style={{ whiteSpace: "pre-wrap" }}>{r.admin_response}</div>
            {r.handled_by_email && (
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                par {r.handled_by_email}
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
            cell: (info) => (
              <div className={styles.actions}>
                <button
                  className={styles.btnOutlineSm}
                  onClick={() => openEditor(info.row.original)}
                >
                  Traiter
                </button>
              </div>
            ),
          }),
        ]
      : []),
  ];

  if (loading) return <p className={styles.stateMsg}>Chargement…</p>;

  return (
    <div className={styles.rbacWrapper}>
      {error && <p className={styles.errorMsg} role="alert">{error}</p>}

      {stats && (
        <div className={styles.kpiGrid}>
          <KpiCard color="amber" icon={<IconInbox />} value={stats.new} label="Nouvelles" />
          <KpiCard
            color="blue"
            icon={<IconFileEdit />}
            value={stats.in_progress}
            label="En cours"
          />
          <KpiCard
            color="emerald"
            icon={<IconCheckCircle />}
            value={stats.resolved}
            label="Résolues"
          />
          <KpiCard color="violet" icon={<IconInbox />} value={stats.total} label="Total" />
        </div>
      )}

      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>
            Demandes des membres ({requests.length})
          </h3>
        </div>

        <div className={styles.filterBar}>
          <select
            className={styles.select}
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); load({ status: e.target.value }); }}
          >
            <option value="">Tous statuts</option>
            {(Object.keys(STATUS_LABELS) as MemberRequestStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); load({ request_type: e.target.value }); }}
          >
            <option value="">Tous les types</option>
            {types.map((t) => (
              <option key={t.id} value={t.label}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.listBody}>
          <DataTable
            columns={columns}
            data={requests}
            getRowId={(r) => r.id}
            emptyMessage="Aucune demande."
          />
        </div>
      </section>

      {editing && (
        <div className={styles.modalOverlay} onClick={() => setEditing(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderIcon} aria-hidden>📋</div>
              <div className={styles.modalHeaderText}>
                <h2 className={styles.modalName}>{editing.request_type}</h2>
                <span className={styles.modalSubtitle}>
                  {editing.member_name} · {editing.member_email}
                </span>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => setEditing(null)}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ whiteSpace: "pre-wrap", marginTop: 0 }}>{editing.message}</p>

              <label className={styles.helpText} htmlFor="request-status">Statut</label>
              <select
                id="request-status"
                className={styles.select}
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as MemberRequestStatus)}
              >
                {(Object.keys(STATUS_LABELS) as MemberRequestStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>

              <label className={styles.helpText} htmlFor="request-response" style={{ marginTop: "0.75rem", display: "block" }}>
                Réponse au membre
              </label>
              <textarea
                id="request-response"
                className={styles.input}
                rows={4}
                placeholder="Votre réponse (envoyée par courriel à la résolution)…"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
              />
              {saveError && (
                <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>
                  {saveError}
                </p>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
      {toasts}
    </div>
  );
}
