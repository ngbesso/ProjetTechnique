import styles from "../AdminPage.module.css";
import { IconCheckCircle, IconEye, IconFileEdit } from "../../../components/ui/icons";
import { KpiCard } from "../../../components/ui/KpiCard";
import type { PostAdminStats } from "../../../types";

/** Indicateurs de publication et palmarès de lecture. */
export function BlogStats({ stats }: { stats: PostAdminStats }) {
  return (
    <>
      <div className={styles.kpiGrid}>
        <KpiCard color="emerald" icon={<IconCheckCircle />} value={stats.published} label="Publiés" />
        <KpiCard color="amber" icon={<IconFileEdit />} value={stats.draft} label="Brouillons" />
        <KpiCard color="violet" icon={<IconEye />} value={stats.total_views} label="Total des vues" />
      </div>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Top 5 des articles les plus lus</h3>
        {stats.top_posts.length === 0 ? (
          <p className={styles.empty}>Aucun article enregistré.</p>
        ) : (
          stats.top_posts.map((p, i) => (
            <div key={p.id} className={styles.topListRow}>
              <span className={i === 0 ? `${styles.topListRank} ${styles.topListRankFirst}` : styles.topListRank}>
                {i + 1}
              </span>
              <div className={styles.topListBody}>
                <span className={styles.topListName}>{p.title}</span>
                <span className={styles.topListValue}>{p.views} vue{p.views > 1 ? "s" : ""} · {p.author}</span>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}
