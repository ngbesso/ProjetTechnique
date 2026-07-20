import type { ReactNode } from "react";
import styles from "./KpiCard.module.css";

export type KpiColor = "violet" | "amber" | "emerald" | "blue" | "rose";

interface KpiCardProps {
  color: KpiColor;
  icon: ReactNode;
  value: string | number;
  label: string;
  sub?: string;
}

export function KpiCard({ color, icon, value, label, sub }: KpiCardProps) {
  return (
    <div className={`${styles.kpiCard} ${styles[color]}`}>
      <div className={`${styles.kpiIcon} ${styles[color]}`}>{icon}</div>
      <div className={styles.kpiBody}>
        <div className={styles.kpiLabel}>{label}</div>
        <div className={styles.kpiValue}>{value}</div>
        {sub && <div className={styles.kpiSub}>{sub}</div>}
      </div>
    </div>
  );
}
