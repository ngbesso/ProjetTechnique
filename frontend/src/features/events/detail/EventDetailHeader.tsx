import styles from "../EventsPage.module.css";
import { formatCurrency } from "../../../lib/format";
import type { EventItem } from "../../../types";

type HeaderFields = Pick<EventItem, "category" | "format" | "price" | "title">;

export function EventDetailHeader({ category, format, price, title }: HeaderFields) {
  return (
    <>
      <div className={styles.cardBadges}>
        <span className={styles.badge}>{category}</span>
        {format === "en_ligne" && <span className={styles.badge}>🌐 En ligne</span>}
        {format === "hybride" && <span className={styles.badge}>🌐 Hybride</span>}
        {price ? <span className={styles.badge}>{formatCurrency(price)}</span> : null}
      </div>

      <h1 className={styles.detailTitle}>{title}</h1>
    </>
  );
}
