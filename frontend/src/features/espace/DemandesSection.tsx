import { useEffect, useState } from "react";
import admin from "../admin/AdminPage.module.css";
import styles from "./EspacePage.module.css";
import { useParameters } from "../../hooks/useParameters";
import { createMemberRequest, fetchMyMemberRequests } from "../../lib/api/memberRequests";
import { formatEventDateTime } from "../../lib/format";
import type { MemberRequest, MemberRequestStatus } from "../../types";

const MEMBER_REQUEST_STATUS_LABEL: Record<MemberRequestStatus, string> = {
  new: "Nouvelle",
  in_progress: "En cours",
  resolved: "Résolue",
};

interface DemandesSectionProps {
  /** Type présélectionné par le lien « Demander une modification » du profil. */
  prefilledType?: string;
}

export function DemandesSection({ prefilledType }: DemandesSectionProps) {
  const { values: types, load: loadTypes } = useParameters("member_request_type");
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestType, setRequestType] = useState(prefilledType ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sent, setSent] = useState(false);

  function load() {
    setLoading(true);
    fetchMyMemberRequests()
      .then(setRequests)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTypes();
    load();
  }, [loadTypes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requestType || !message.trim()) return;
    setSending(true);
    setSendError("");
    setSent(false);
    try {
      await createMemberRequest({ request_type: requestType, message: message.trim() });
      setMessage("");
      setSent(true);
      load();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={admin.rbacWrapper}>
      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Nouvelle demande</h3>
        <p className={styles.lockNote}>
          Utilisez ce formulaire pour toute demande à votre église : correction de vos
          informations personnelles, adhésion à un ministère, question administrative…
        </p>
        <form onSubmit={handleSubmit}>
          <div className={styles.fieldGroup} style={{ marginTop: "0.75rem" }}>
            <label className={styles.label} htmlFor="request-type">Type de demande</label>
            <select
              id="request-type"
              className={admin.select}
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              required
            >
              <option value="">Choisir un type…</option>
              {types.map((t) => (
                <option key={t.id} value={t.label}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.fieldGroup} style={{ marginTop: "0.75rem" }}>
            <label className={styles.label} htmlFor="request-message">Votre message</label>
            <textarea
              id="request-message"
              className={admin.input}
              rows={4}
              placeholder="Décrivez votre demande…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          {sendError && <p className={admin.errorMsg} role="alert">{sendError}</p>}
          <div className={styles.formActions}>
            <button type="submit" className={admin.btnPrimary} disabled={sending}>
              {sending ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </form>
      </section>

      {sent && (
        <p className={styles.successMsg}><span>✓</span> Votre demande a été envoyée.</p>
      )}
      {error && <p className={admin.errorMsg} role="alert">{error}</p>}

      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Mes demandes</h3>
        {loading ? (
          <p className={admin.stateMsg}>Chargement…</p>
        ) : requests.length === 0 ? (
          <p className={admin.empty}>Aucune demande envoyée pour le moment.</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className={styles.requestCard}>
              <p className={styles.requestMessage}>
                <strong>{r.request_type}</strong>
              </p>
              <p className={styles.requestMessage}>{r.message}</p>
              {r.admin_response && (
                <p className={styles.requestMessage}>
                  <strong>Réponse :</strong> {r.admin_response}
                </p>
              )}
              <div className={styles.requestMeta}>
                <span className={styles.requestDate}>{formatEventDateTime(r.created_at)}</span>
                <span className={styles.requestBadge}>
                  {MEMBER_REQUEST_STATUS_LABEL[r.status]}
                </span>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
