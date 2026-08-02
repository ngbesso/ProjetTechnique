import { useEffect } from "react";
import admin from "../admin/AdminPage.module.css";
import styles from "./EspacePage.module.css";
import { useNavigate } from "../../context/RouterContext";
import { useDonations } from "../../hooks/useDonations";
import { formatCurrency } from "../../lib/format";

const CATEGORY_LABELS: Record<string, string> = {
  soutien_spirituel: "Soutien spirituel",
  action_communautaire: "Action communautaire",
  developpement: "Développement",
};

interface DonsSectionProps {
  churchName: (id: number | null | undefined) => string;
}

export function DonsSection({ churchName }: DonsSectionProps) {
  const navigate = useNavigate();
  const { donations, loading, error, load } = useDonations();

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className={admin.stateMsg}>Chargement…</p>;

  const currentYear = new Date().getFullYear();
  const totalsByCurrency = donations
    .filter((d) => new Date(d.created_at).getFullYear() === currentYear)
    .reduce<Record<string, number>>((acc, d) => {
      acc[d.currency] = (acc[d.currency] ?? 0) + d.amount;
      return acc;
    }, {});

  return (
    <div className={admin.rbacWrapper}>
      {error && <p className={admin.errorMsg} role="alert">{error}</p>}

      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Total {currentYear}</h3>
        {Object.keys(totalsByCurrency).length === 0 ? (
          <p className={admin.empty}>Aucun don cette année.</p>
        ) : (
          <div className={styles.totalsRow}>
            {Object.entries(totalsByCurrency).map(([cur, amt]) => (
              <span key={cur} className={styles.totalBadge}>
                {formatCurrency(amt, cur)}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className={admin.listCard}>
        <div className={admin.listHeader}>
          <h3 className={admin.cardTitle} style={{ margin: 0 }}>
            Historique des dons ({donations.length})
          </h3>
        </div>

        {donations.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyIcon}>💝</p>
            <p>Aucun don pour le moment.</p>
            <button className={admin.btnPrimary} onClick={() => navigate("donation")}>
              ♥ Faire un don
            </button>
          </div>
        ) : (
          <div className={admin.listBody}>
            <table className={admin.table}>
              <thead>
                <tr>
                  <th className={admin.th}>Date</th>
                  <th className={admin.th}>Église</th>
                  <th className={admin.th}>Catégorie</th>
                  <th className={admin.th}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.id}>
                    <td className={admin.td}>{new Date(d.created_at).toLocaleDateString("fr-CA")}</td>
                    <td className={admin.td}>{churchName(d.church_id)}</td>
                    <td className={admin.td}>{d.category ? CATEGORY_LABELS[d.category] ?? d.category : "—"}</td>
                    <td className={admin.td}>
                      <strong>{d.amount.toFixed(2)}</strong> {d.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
