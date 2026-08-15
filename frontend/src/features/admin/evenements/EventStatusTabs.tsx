import styles from "../EvenementsPanel.module.css";
import type { EventStatus } from "../../../types";

export type StatusTab = "all" | EventStatus;

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "draft", label: "Brouillons" },
  { id: "published", label: "Publiés" },
  { id: "cancelled", label: "Annulés" },
  { id: "completed", label: "Terminés" },
];

interface EventStatusTabsProps {
  active: StatusTab;
  onChange: (tab: StatusTab) => void;
}

export function EventStatusTabs({ active, onChange }: EventStatusTabsProps) {
  return (
    <div className={styles.statusTabs}>
      {STATUS_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={active === t.id ? `${styles.statusTab} ${styles.statusTabActive}` : styles.statusTab}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
