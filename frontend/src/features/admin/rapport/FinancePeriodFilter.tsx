import styles from "../AdminPage.module.css";
import { PERIODS, PERIOD_LABELS } from "./financePeriods";
import type { FinancePeriod } from "../../../types";

interface FinancePeriodFilterProps {
  period: FinancePeriod | "";
  onSelect: (period: FinancePeriod | "") => void;
  customStart: string;
  onCustomStartChange: (value: string) => void;
  customEnd: string;
  onCustomEndChange: (value: string) => void;
}

export function FinancePeriodFilter({
  period,
  onSelect,
  customStart,
  onCustomStartChange,
  customEnd,
  onCustomEndChange,
}: FinancePeriodFilterProps) {
  return (
    <>
      <div className={styles.filterBar}>
        {PERIODS.map((p) => (
          <button
            key={p}
            className={period === p ? styles.btnPrimary : styles.btnOutlineSm}
            onClick={() => onSelect(p)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
        <button
          className={period === "" ? styles.btnPrimary : styles.btnOutlineSm}
          onClick={() => onSelect("")}
        >
          Historique complet
        </button>
      </div>

      {period === "custom" && (
        <div className={styles.filterBar}>
          <input
            type="date"
            className={styles.input}
            value={customStart}
            onChange={(e) => onCustomStartChange(e.target.value)}
          />
          <input
            type="date"
            className={styles.input}
            value={customEnd}
            onChange={(e) => onCustomEndChange(e.target.value)}
          />
        </div>
      )}
    </>
  );
}
