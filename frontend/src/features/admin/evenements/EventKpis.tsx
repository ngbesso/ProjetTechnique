import styles from "../EvenementsPanel.module.css";
import { KpiCard } from "../../../components/ui/KpiCard";
import {
  IconCalendar,
  IconCheckCircle,
  IconFileEdit,
  IconXCircle,
} from "../../../components/ui/icons";
import type { EventItem } from "../../../types";

function countBy(events: EventItem[], status: EventItem["status"]): number {
  return events.filter((e) => e.status === status).length;
}

export function EventKpis({ events }: { events: EventItem[] }) {
  return (
    <div className={styles.kpiGrid}>
      <KpiCard color="violet" icon={<IconCalendar />} value={events.length} label="Total" />
      <KpiCard color="amber" icon={<IconFileEdit />} value={countBy(events, "draft")} label="Brouillons" />
      <KpiCard color="emerald" icon={<IconCheckCircle />} value={countBy(events, "published")} label="Publiés" />
      <KpiCard color="rose" icon={<IconXCircle />} value={countBy(events, "cancelled")} label="Annulés" />
    </div>
  );
}
