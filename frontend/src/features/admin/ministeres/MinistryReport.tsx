import { useEffect, useState } from "react";
import styles from "../AdminPage.module.css";
import { fetchMinistriesStats } from "../../../lib/api/ministryAffiliations";
import type { MinistryStatsItem } from "../../../types";

interface MinistryReportProps {
  onSelectMinistry: (ministry: string) => void;
}

/** Effectifs par ministère, avec accès direct à la gestion de chacun. */
export function MinistryReport({ onSelectMinistry }: MinistryReportProps) {
  const [stats, setStats] = useState<MinistryStatsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMinistriesStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Rapport — membres par ministère</h3>
      {error && <p className={styles.errorMsg} role="alert">{error}</p>}
      {loading ? (
        <p className={styles.stateMsg}>Chargement…</p>
      ) : stats.length === 0 ? (
        <p className={styles.empty}>Aucun ministère configuré.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: ".35rem" }}>
          {stats.map((s) => (
            <li
              key={s.ministry}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".6rem 0", borderBottom: "1px solid var(--border)" }}
            >
              <span>{s.ministry}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <strong>{s.count}</strong>
                <button className={styles.btnOutlineSm} onClick={() => onSelectMinistry(s.ministry)}>
                  Gérer
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
