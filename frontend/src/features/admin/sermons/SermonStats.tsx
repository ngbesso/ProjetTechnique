import styles from "../AdminPage.module.css";
import { IconCheckCircle, IconEye, IconFileEdit } from "../../../components/ui/icons";
import { KpiCard } from "../../../components/ui/KpiCard";
import type { SermonAdminStats } from "../../../types";

/** Indicateurs de publication et palmarès d'écoute. */
export function SermonStats({ stats }: { stats: SermonAdminStats }) {
  return (
    <>
      <div className={styles.kpiGrid}>
        <KpiCard color="emerald" icon={<IconCheckCircle />} value={stats.published} label="Publiés" />
        <KpiCard color="amber" icon={<IconFileEdit />} value={stats.draft} label="Brouillons" />
        <KpiCard color="violet" icon={<IconEye />} value={stats.total_views} label="Total des vues" />
      </div>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Top 5 des sermons les plus vus</h3>
        {stats.top_sermons.length === 0 ? (
          <p className={styles.empty}>Aucun sermon enregistré.</p>
        ) : (
          stats.top_sermons.map((s, i) => (
            <div key={s.id} className={styles.topListRow}>
              <span className={i === 0 ? `${styles.topListRank} ${styles.topListRankFirst}` : styles.topListRank}>
                {i + 1}
              </span>
              <div className={styles.topListBody}>
                <span className={styles.topListName}>{s.title}</span>
                <span className={styles.topListValue}>{s.views} vue{s.views > 1 ? "s" : ""} · {s.preacher}</span>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}
