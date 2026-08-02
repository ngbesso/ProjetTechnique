import { useEffect, useState } from "react";
import admin from "../admin/AdminPage.module.css";
import styles from "./EspacePage.module.css";
import { getVolunteerOpportunities } from "../../lib/api/events";
import { createVolunteerRequest, fetchMyVolunteerRequests } from "../../lib/api/volunteerRequests";
import { formatEventDateTime } from "../../lib/format";
import type {
  VolunteerOpportunity,
  VolunteerRequest,
  VolunteerRequestStatus,
} from "../../types";

const VOLUNTEER_STATUS_LABEL: Record<VolunteerRequestStatus, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Refusée",
};

export function BenevolatSection() {
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [requests, setRequests] = useState<VolunteerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sent, setSent] = useState(false);

  function load() {
    setLoading(true);
    setError("");
    Promise.all([getVolunteerOpportunities(), fetchMyVolunteerRequests()])
      .then(([opps, reqs]) => {
        setOpportunities(opps);
        setRequests(reqs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  // Les événements pour lesquels une demande a déjà été envoyée ne peuvent pas
  // être proposés une seconde fois.
  const alreadyRequested = new Set(requests.map((r) => r.event_id));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedId === null) return;
    setSending(true);
    setSendError("");
    setSent(false);
    try {
      await createVolunteerRequest({
        event_id: selectedId,
        message: message.trim() || undefined,
      });
      setSelectedId(null);
      setMessage("");
      setSent(true);
      load();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p className={admin.stateMsg}>Chargement…</p>;

  return (
    <div className={admin.rbacWrapper}>
      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Opportunités de bénévolat</h3>
        {opportunities.length === 0 ? (
          <p className={admin.empty}>
            Aucun événement ne recherche de bénévoles pour le moment.
          </p>
        ) : (
          opportunities.map((o) => {
            const done = alreadyRequested.has(o.event_id);
            return (
              <div key={o.event_id} className={styles.requestCard}>
                <p className={styles.requestMessage}>
                  <strong>{o.title}</strong>
                  {o.location && <> — {o.location}</>}
                </p>
                {o.volunteer_message && (
                  <p className={styles.requestMessage}>{o.volunteer_message}</p>
                )}
                <div className={styles.requestMeta}>
                  <span className={styles.requestDate}>{formatEventDateTime(o.date_start)}</span>
                  <span className={styles.requestBadge}>
                    {o.volunteer_spots_left} place(s) restante(s)
                  </span>
                </div>

                {done ? (
                  <p className={admin.empty}>Demande déjà envoyée pour cet événement.</p>
                ) : selectedId === o.event_id ? (
                  <form onSubmit={handleSubmit} style={{ marginTop: "0.75rem" }}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label} htmlFor={`volunteer-message-${o.event_id}`}>
                        Message (optionnel)
                      </label>
                      <textarea
                        id={`volunteer-message-${o.event_id}`}
                        className={admin.input}
                        rows={3}
                        placeholder="Précisez vos disponibilités ou compétences…"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </div>
                    {sendError && <p className={admin.errorMsg} role="alert">{sendError}</p>}
                    <div className={styles.formActions}>
                      <button
                        type="button"
                        className={admin.btnGhost}
                        onClick={() => { setSelectedId(null); setSendError(""); }}
                        disabled={sending}
                      >
                        Annuler
                      </button>
                      <button type="submit" className={admin.btnPrimary} disabled={sending}>
                        {sending ? "Envoi…" : "Envoyer ma proposition"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={admin.btnPrimary}
                      onClick={() => { setSelectedId(o.event_id); setMessage(""); setSendError(""); setSent(false); }}
                    >
                      Je me propose
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {sent && (
        <p className={styles.successMsg}><span>✓</span> Votre demande de bénévolat a été envoyée.</p>
      )}
      {error && <p className={admin.errorMsg} role="alert">{error}</p>}

      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Mes demandes</h3>
        {requests.length === 0 ? (
          <p className={admin.empty}>Aucune demande envoyée pour le moment.</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className={styles.requestCard}>
              <p className={styles.requestMessage}>
                <strong>{r.event_title}</strong>
                {r.message && <> — {r.message}</>}
              </p>
              <div className={styles.requestMeta}>
                <span className={styles.requestDate}>{formatEventDateTime(r.created_at)}</span>
                <span className={`${styles.requestBadge} ${styles[r.status]}`}>
                  {VOLUNTEER_STATUS_LABEL[r.status]}
                </span>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
