import { useCallback, useEffect, useState } from "react";
import adminStyles from "../AdminPage.module.css";
import styles from "../EvenementsPanel.module.css";
import { Button } from "../../../components/ui/Button";
import {
  fetchVolunteerRequestsAdmin,
  updateVolunteerRequestStatus,
} from "../../../lib/api/volunteerRequests";
import { resendVolunteerAnnouncement } from "../../../lib/api/events";
import { formatDate } from "../../../lib/format";
import type { EventItem, VolunteerRequestAdmin } from "../../../types";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Refusé",
};

interface EvenementsVolunteersModalProps {
  event: EventItem;
  onClose: () => void;
}

export function EvenementsVolunteersModal({ event, onClose }: EvenementsVolunteersModalProps) {
  const [requests, setRequests] = useState<VolunteerRequestAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [announcing, setAnnouncing] = useState(false);
  const [announceMsg, setAnnounceMsg] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetchVolunteerRequestsAdmin({ event_id: event.id })
      .then(setRequests)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [event.id]);

  useEffect(() => { load(); }, [load]);

  const approvedCount = requests.filter((r) => r.status === "approved").length;

  async function handleDecision(id: number, status: "approved" | "rejected") {
    setBusyId(id);
    setError("");
    try {
      await updateVolunteerRequestStatus(id, status);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mise à jour impossible");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAnnounce() {
    setAnnouncing(true);
    setAnnounceMsg("");
    setError("");
    try {
      const res = await resendVolunteerAnnouncement(event.id);
      setAnnounceMsg(`Annonce envoyée à ${res.recipients} membre(s).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setAnnouncing(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.participantsCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.formHeader}>
          <div className={styles.formHeaderIcon} aria-hidden>🤝</div>
          <div>
            <p className={styles.formHeaderTitle}>Bénévoles</p>
            <p className={styles.formHeaderSub}>
              {event.title}
              {" — "}
              {event.volunteer_capacity !== null
                ? `${approvedCount} / ${event.volunteer_capacity} approuvé(s)`
                : `${approvedCount} approuvé(s) · capacité illimitée`}
            </p>
          </div>
          <button
            type="button"
            className={styles.formHeaderClose}
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className={styles.participantsBody}>
          {event.volunteer_capacity !== null && (
            <div className={styles.participantsActions}>
              <Button type="button" variant="outline" onClick={handleAnnounce} disabled={announcing}>
                {announcing ? "Envoi…" : "📣 Relancer l'annonce"}
              </Button>
            </div>
          )}

          {announceMsg && (
            <p style={{ color: "var(--vivid-violet)", fontSize: ".85rem" }}>{announceMsg}</p>
          )}
          {error && <p className={adminStyles.errorMsg} role="alert">{error}</p>}

          {loading ? (
            <p className={adminStyles.stateMsg}>Chargement…</p>
          ) : requests.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyIcon} aria-hidden>🤝</p>
              <p className={styles.emptyText}>Aucune demande de bénévolat.</p>
            </div>
          ) : (
            requests.map((r) => (
              <div key={r.id} className={styles.participantRow}>
                <span className={styles.participantName}>
                  {r.member_name}
                  <span style={{ marginLeft: ".5rem", fontWeight: 400, color: "var(--text-muted)" }}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </span>
                <span className={styles.participantMeta}>
                  {r.member_email} · demandé le {formatDate(r.created_at)}
                  {r.message ? ` — « ${r.message} »` : ""}
                </span>
                <div className={adminStyles.actions} style={{ marginTop: ".4rem" }}>
                  {r.status !== "approved" && (
                    <button
                      className={adminStyles.btnPrimarySm}
                      disabled={busyId === r.id}
                      onClick={() => handleDecision(r.id, "approved")}
                    >
                      Approuver
                    </button>
                  )}
                  {r.status !== "rejected" && (
                    <button
                      className={adminStyles.btnDanger}
                      disabled={busyId === r.id}
                      onClick={() => handleDecision(r.id, "rejected")}
                    >
                      Refuser
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
