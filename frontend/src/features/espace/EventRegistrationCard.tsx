import styles from "./EspacePage.module.css";
import { formatEventDateTime } from "../../lib/format";
import type { MyEventRegistration } from "../../types";

/** Carte d'une inscription à un événement. Le lien de connexion n'apparaît que
 *  pour les formats en ligne/hybride et seulement tant que l'événement est à
 *  venir ; le lieu est masqué pour un événement purement en ligne. */
export function EventRegistrationCard({
  reg,
  isPast,
}: {
  reg: MyEventRegistration;
  isPast?: boolean;
}) {
  const format = reg.event.format;
  const showLink = format === "en_ligne" || format === "hybride";
  const showLocation = format !== "en_ligne" && reg.event.location;
  return (
    <div className={`${styles.regCard} ${isPast ? styles.pastReg : ""}`}>
      <div>
        <p className={styles.regTitle}>{reg.event.title}</p>
        <p className={styles.regMeta}>
          {formatEventDateTime(reg.event.date_start)}
          {format === "en_ligne" ? " · En ligne" : showLocation ? ` · ${reg.event.location}` : ""}
        </p>
        {showLink && reg.event.online_link && !isPast && (
          <p className={styles.regMeta}>
            🌐{" "}
            <a href={reg.event.online_link} target="_blank" rel="noreferrer">
              {reg.event.online_link}
            </a>
          </p>
        )}
      </div>
      <span className={styles.regPrice}>{reg.event.category}</span>
    </div>
  );
}
