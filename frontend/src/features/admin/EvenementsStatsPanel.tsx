import { useEffect, useState } from "react";
import adminStyles from "./AdminPage.module.css";
import styles from "./EvenementsStatsPanel.module.css";
import { getEventsStats } from "../../lib/api/events";
import type { EventCategory, EventStats, EventStatus } from "../../types";

const CATEGORY_LABELS: Record<EventCategory, string> = {
  conference: "Conférence",
  colloque: "Colloque",
  croisade: "Croisade",
  retraite: "Retraite",
  formation: "Formation",
};

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  cancelled: "Annulé",
  completed: "Terminé",
};

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: "#d97706",
  published: "#059669",
  cancelled: "#e11d48",
  completed: "#2563eb",
};

export function EvenementsStatsPanel() {
  const [stats, setStats] = useState<EventStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEventsStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className={adminStyles.stateMsg}>Chargement…</p>;
  if (error) return <p className={adminStyles.errorMsg} role="alert">{error}</p>;
  if (!stats) return null;

  const maxCount = Math.max(...stats.top_events.map((e) => e.registered_count), 1);
  const totalEvents = stats.status_breakdown.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className={adminStyles.rbacWrapper}>
      <section className={adminStyles.card}>
        <h3 className={adminStyles.cardTitle}>Top 5 des événements par inscriptions</h3>
        {stats.top_events.length === 0 ? (
          <p className={adminStyles.empty}>Aucune inscription enregistrée pour le moment.</p>
        ) : (
          <div className={styles.list}>
            {stats.top_events.map((e, i) => (
              <div key={e.id} className={styles.rankRow}>
                <span className={i === 0 ? `${styles.rankBadge} ${styles.rankBadgeTop}` : styles.rankBadge}>
                  {i + 1}
                </span>
                <div className={styles.rankBody}>
                  <div className={styles.rankHeader}>
                    <span className={styles.rankTitle}>{e.title}</span>
                    <span className={styles.rankCount}>
                      {e.registered_count} inscrit{e.registered_count > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${(e.registered_count / maxCount) * 100}%` }}
                    />
                  </div>
                  <p className={styles.rankCategory}>{CATEGORY_LABELS[e.category]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={adminStyles.card}>
        <h3 className={adminStyles.cardTitle}>Répartition des événements par statut</h3>
        {stats.status_breakdown.map((row) => (
          <div key={row.status} className={styles.statusRow}>
            <div className={styles.statusHeader}>
              <span className={styles.statusLabel}>{STATUS_LABELS[row.status]}</span>
              <span className={styles.statusCount}>{row.count}</span>
            </div>
            <div className={styles.statusBarTrack}>
              <div
                className={styles.statusBarFill}
                style={{
                  width: totalEvents > 0 ? `${(row.count / totalEvents) * 100}%` : "0%",
                  background: STATUS_COLORS[row.status],
                }}
              />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
