import styles from "./EventsPage.module.css";
import { formatCurrency, formatDateRange } from "../../lib/format";
import type { EventItem } from "../../types";

type CardFields = Pick<
  EventItem,
  | "id"
  | "image_url"
  | "date_start"
  | "date_end"
  | "category"
  | "format"
  | "district"
  | "price"
  | "title"
  | "location"
  | "instructor"
  | "show_registration_count"
  | "capacity"
  | "spots_left"
>;

interface EventCardProps {
  event: CardFields;
  /** Un événement passé s'affiche en retrait, sans compteur d'inscrits. */
  isPast?: boolean;
  onOpen: (id: number) => void;
}

function isFull(event: Pick<CardFields, "capacity" | "spots_left">): boolean {
  return event.capacity !== null && (event.spots_left ?? 0) <= 0;
}

function spotsLabel(spotsLeft: number): string {
  const plural = spotsLeft > 1 ? "s" : "";
  return `${spotsLeft} place${plural} restante${plural}`;
}

/** Compteur d'inscrits — masqué quand l'organisateur a désactivé
 *  `show_registration_count`, y compris le badge « Complet », qui révélerait
 *  indirectement le remplissage. */
function SpotsBadge({ event }: { event: CardFields }) {
  if (event.capacity === null) {
    return <span className={styles.badge}>Places illimitées</span>;
  }
  if (isFull(event)) {
    return <span className={styles.spotsFull}>Complet</span>;
  }
  return <span className={styles.spotsLeft}>{spotsLabel(event.spots_left ?? 0)}</span>;
}

export function EventCard({ event, isPast = false, onOpen }: EventCardProps) {
  return (
    <article className={isPast ? `${styles.card} ${styles.cardPast}` : styles.card}>
      {event.image_url && (
        <div className={styles.cardImage}>
          <img src={event.image_url} alt="" />
        </div>
      )}
      <div className={styles.cardDate}>{formatDateRange(event.date_start, event.date_end)}</div>
      <div className={styles.cardBody}>
        <div className={styles.cardBadges}>
          <span className={styles.badge}>{event.category}</span>
          {event.format === "en_ligne" && <span className={styles.badge}>🌐 En ligne</span>}
          {event.format === "hybride" && <span className={styles.badge}>🌐 Hybride</span>}
          {event.district && <span className={styles.badge}>{event.district}</span>}
          {event.price ? <span className={styles.badge}>{formatCurrency(event.price)}</span> : null}
        </div>
        <h2 className={styles.cardTitle}>{event.title}</h2>
        {event.format !== "en_ligne" && event.location && (
          <p className={styles.cardMeta}>📍 {event.location}</p>
        )}
        {event.format === "hybride" && (
          <p className={styles.cardMeta}>🌐 Aussi disponible en ligne</p>
        )}
        {event.instructor && <p className={styles.cardMeta}>👤 {event.instructor}</p>}
        {!isPast && event.show_registration_count && (
          <div className={styles.cardBadges}>
            <SpotsBadge event={event} />
          </div>
        )}
        <button className={styles.btnDetail} onClick={() => onOpen(event.id)}>
          Voir détail
        </button>
      </div>
    </article>
  );
}
