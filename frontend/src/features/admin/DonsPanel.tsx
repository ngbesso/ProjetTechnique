import { useEffect } from "react";
import styles from "./AdminPage.module.css";
import { fetchAllDonations } from "../../lib/api/donations";
import { useState } from "react";
import type { Donation } from "../../types";

const CATEGORY_LABELS: Record<string, string> = {
  soutien_spirituel: "Soutien spirituel",
  action_communautaire: "Action communautaire",
  developpement: "Développement",
};

const STATUS_LABELS: Record<string, string> = {
  manual: "Manuel",
  succeeded: "Réussi",
  pending: "En attente",
  failed: "Échoué",
};

export function DonsPanel() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAllDonations()
      .then(setDonations)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const total = donations.reduce((sum, d) => sum + d.amount, 0);

  if (loading) return <p className={styles.stateMsg}>Chargement…</p>;

  return (
    <div className={styles.rbacWrapper}>
      {error && (
        <p className={styles.errorMsg} role="alert">
          {error}
        </p>
      )}

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>
          Dons reçus ({donations.length})
          {donations.length > 0 && (
            <span style={{ fontWeight: 400, fontSize: "0.9rem", marginLeft: "0.75rem", color: "var(--text-muted)" }}>
              · Total : {total.toFixed(2)} $
            </span>
          )}
        </h3>

        {donations.length === 0 ? (
          <p className={styles.empty}>Aucun don enregistré.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Donateur</th>
                <th className={styles.th}>Montant</th>
                <th className={styles.th}>Catégorie</th>
                <th className={styles.th}>Statut</th>
                <th className={styles.th}>Reçu</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.id}>
                  <td className={styles.td}>
                    {new Date(d.created_at).toLocaleDateString("fr-CA")}
                  </td>
                  <td className={styles.td}>
                    <div>{d.donor_name ?? <em style={{ color: "var(--text-muted)" }}>Anonyme</em>}</div>
                    {d.donor_email && (
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{d.donor_email}</div>
                    )}
                  </td>
                  <td className={styles.td}>
                    <strong>{d.amount.toFixed(2)}</strong> {d.currency}
                  </td>
                  <td className={styles.td}>
                    {d.category ? CATEGORY_LABELS[d.category] ?? d.category : <em style={{ color: "var(--text-muted)" }}>—</em>}
                  </td>
                  <td className={styles.td}>
                    <span
                      className={
                        d.payment_status === "succeeded"
                          ? styles.badgeActive
                          : d.payment_status === "failed"
                          ? styles.badgeRejected
                          : d.payment_status === "pending"
                          ? styles.badgePending
                          : styles.badgeInactive
                      }
                      style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600 }}
                    >
                      {STATUS_LABELS[d.payment_status] ?? d.payment_status}
                    </span>
                  </td>
                  <td className={styles.td} style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                    {d.receipt_number}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
