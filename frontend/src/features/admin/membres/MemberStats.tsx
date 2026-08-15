import styles from "../AdminPage.module.css";
import { IconCheckCircle, IconClock, IconXCircle } from "../../../components/ui/icons";
import { KpiCard } from "../../../components/ui/KpiCard";
import type { MemberStatusStats } from "../../../types";

/** Inactif : ni actif ni refusé — un cercle barré plutôt qu'une croix. */
function IconMinusCircle() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

export function MemberStats({ stats }: { stats: MemberStatusStats }) {
  return (
    <div className={styles.kpiGrid}>
      <KpiCard color="emerald" icon={<IconCheckCircle />} value={stats.active} label="Actifs" />
      <KpiCard color="amber" icon={<IconClock />} value={stats.pending} label="En attente" />
      <KpiCard color="blue" icon={<IconMinusCircle />} value={stats.inactive} label="Inactifs" />
      <KpiCard color="rose" icon={<IconXCircle />} value={stats.rejected} label="Refusés" />
    </div>
  );
}
