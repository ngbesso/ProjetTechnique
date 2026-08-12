import styles from "../EventsPage.module.css";
import { formatDateTime } from "../../../lib/format";
import type { EventItem } from "../../../types";

type PracticalFields = Pick<
  EventItem,
  | "date_start"
  | "date_end"
  | "format"
  | "location"
  | "instructor"
  | "district"
  | "show_registration_count"
  | "capacity"
  | "spots_left"
>;

function spotsLabel({ capacity, spots_left }: Pick<PracticalFields, "capacity" | "spots_left">) {
  if (capacity === null) return "Places illimitées";
  if ((spots_left ?? 0) > 0) return `${spots_left} place(s) restante(s) sur ${capacity}`;
  return "Événement complet";
}

export function EventPracticalInfo(event: PracticalFields) {
  return (
    <>
      <p className={styles.detailMeta}>
        🗓️ {formatDateTime(event.date_start)}
        {event.date_end ? ` – ${formatDateTime(event.date_end)}` : ""}
      </p>
      {event.format !== "en_ligne" && event.location && (
        <p className={styles.detailMeta}>📍 {event.location}</p>
      )}
      {event.format !== "presentiel" && (
        <p className={styles.detailMeta}>
          🌐{" "}
          {event.format === "hybride"
            ? "Aussi disponible en ligne"
            : "Cet événement se déroule en ligne"}{" "}
          — le lien de connexion vous sera communiqué après votre inscription.
        </p>
      )}
      {event.instructor && <p className={styles.detailMeta}>👤 {event.instructor}</p>}
      {event.district && <p className={styles.detailMeta}>🗺️ District {event.district}</p>}
      {event.show_registration_count && (
        <p className={styles.detailMeta}>{spotsLabel(event)}</p>
      )}
    </>
  );
}
