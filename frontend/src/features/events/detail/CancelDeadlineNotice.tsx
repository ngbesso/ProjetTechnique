import styles from "../EventsPage.module.css";
import type { CancelDeadlineInfo } from "../../../lib/eventPolicy";

/** Rappel du délai d'annulation, en alerte une fois le délai dépassé. */
export function CancelDeadlineNotice({ deadline }: { deadline: CancelDeadlineInfo }) {
  return (
    <p className={deadline.passed ? styles.errorMsg : styles.detailMeta}>{deadline.label}</p>
  );
}
