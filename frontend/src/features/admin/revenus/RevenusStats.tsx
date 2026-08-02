import styles from "../AdminPage.module.css";
import { IconTrendingUp } from "../../../components/ui/icons";
import { KpiCard } from "../../../components/ui/KpiCard";
import { formatCurrency } from "../../../lib/format";
import { CATEGORY_LABELS } from "./shared";
import type { DonationAdminStats } from "../../../types";

// ── Icônes KPI ────────────────────────────────────────────────────────────────

function IconDollar() {
  return (
    <svg viewBox="0 0 24 24">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

interface RevenusStatsProps {
  stats: DonationAdminStats;
}

/** Bandeau de KPI + palmarès (donateurs, églises) de l'onglet Revenus. */
export function RevenusStats({ stats }: RevenusStatsProps) {
  return (
    <>
      <div className={styles.kpiGrid}>
        <KpiCard
          color="violet"
          icon={<IconDollar />}
          value={formatCurrency(stats.total_cad)}
          label="Montant total"
          sub={stats.total_usd > 0 ? `+ ${stats.total_usd.toFixed(2)} $ USD` : undefined}
        />
        {stats.by_category.map((c, i) => (
          <KpiCard
            key={c.category}
            color={i === 0 ? "amber" : i === 1 ? "emerald" : "blue"}
            icon={
              c.category === "soutien_spirituel" ? <IconHeart /> :
              c.category === "action_communautaire" ? <IconUsers /> :
              <IconTrendingUp />
            }
            value={c.count}
            label={CATEGORY_LABELS[c.category] ?? c.category}
          />
        ))}
      </div>

      <div className={styles.topListsGrid}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Top 5 donateurs</h3>
          {stats.top_donors.length === 0 ? (
            <p className={styles.empty}>Aucun don enregistré.</p>
          ) : (
            stats.top_donors.map((d, i) => (
              <div key={`${d.name}-${i}`} className={styles.topListRow}>
                <span className={i === 0 ? `${styles.topListRank} ${styles.topListRankFirst}` : styles.topListRank}>
                  {i + 1}
                </span>
                <div className={styles.topListBody}>
                  <span className={styles.topListName}>{d.name}</span>
                  <span className={styles.topListValue}>
                    {formatCurrency(d.total)} · {d.count} don{d.count > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            ))
          )}
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Top églises</h3>
          {stats.top_churches.length === 0 ? (
            <p className={styles.empty}>Aucun don enregistré.</p>
          ) : (
            stats.top_churches.map((c, i) => (
              <div key={c.church_id} className={styles.topListRow}>
                <span className={i === 0 ? `${styles.topListRank} ${styles.topListRankFirst}` : styles.topListRank}>
                  {i + 1}
                </span>
                <div className={styles.topListBody}>
                  <span className={styles.topListName}>{c.church_name}</span>
                  <span className={styles.topListValue}>{formatCurrency(c.total)}</span>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </>
  );
}
