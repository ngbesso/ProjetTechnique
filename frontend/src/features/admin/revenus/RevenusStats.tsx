import styles from "../AdminPage.module.css";
import {
  IconDollar,
  IconHeart,
  IconTrendingUp,
  IconUsers,
} from "../../../components/ui/icons";
import { KpiCard } from "../../../components/ui/KpiCard";
import { formatCurrency } from "../../../lib/format";
import { CATEGORY_LABELS } from "./donationLabels";
import type { DonationAdminStats } from "../../../types";

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
