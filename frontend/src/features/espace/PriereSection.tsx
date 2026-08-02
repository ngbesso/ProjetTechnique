import { useEffect, useState } from "react";
import admin from "../admin/AdminPage.module.css";
import styles from "./EspacePage.module.css";
import { createPrayerRequest, fetchMyPrayerRequests } from "../../lib/api/prayerRequests";
import { formatEventDateTime } from "../../lib/format";
import type { PrayerRequest, PrayerRequestStatus } from "../../types";

const PRAYER_STATUS_LABEL: Record<PrayerRequestStatus, string> = {
  new: "Nouvelle",
  handled: "Traitée",
};

export function PriereSection() {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sent, setSent] = useState(false);

  function load() {
    setLoading(true);
    fetchMyPrayerRequests()
      .then(setRequests)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setSendError("");
    setSent(false);
    try {
      await createPrayerRequest({ message: message.trim() });
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
        <h3 className={admin.cardTitle}>Nouvelle demande de prière</h3>
        <form onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="prayer-message">Votre demande</label>
            <textarea
              id="prayer-message"
              className={admin.input}
              rows={4}
              placeholder="Partagez votre sujet de prière…"
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
        <p className={styles.successMsg}><span>✓</span> Votre demande de prière a été envoyée.</p>
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
              <p className={styles.requestMessage}>{r.message}</p>
              <div className={styles.requestMeta}>
                <span className={styles.requestDate}>{formatEventDateTime(r.created_at)}</span>
                <span className={`${styles.requestBadge} ${styles[r.status]}`}>
                  {PRAYER_STATUS_LABEL[r.status]}
                </span>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
