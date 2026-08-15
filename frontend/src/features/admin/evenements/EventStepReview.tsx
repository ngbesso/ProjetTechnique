import styles from "../EvenementsPanel.module.css";
import { formatEventDateTime } from "../../../lib/format";
import { FORMAT_LABELS, STATUS_LABELS, churchLabel, eventPriceLabel } from "./eventLabels";
import type { EventFormValues } from "./eventDefaults";
import type { Church } from "../../../types";

interface EventStepReviewProps {
  /** Étape de relecture : elle récapitule l'ensemble des champs, en lecture seule. */
  values: EventFormValues;
  churches: Church[];
  imagePreviewUrl: string | null;
}

const EMPTY_MARK = "—";

/** Ligne du récapitulatif ; un champ non renseigné s'affiche en tiret. */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.reviewRow}>
      <span className={styles.reviewLabel}>{label}</span>
      <span className={styles.reviewValue}>{value || EMPTY_MARK}</span>
    </div>
  );
}

function dateLabel(iso: string): string {
  return iso ? formatEventDateTime(iso) : EMPTY_MARK;
}

function volunteerLabel(values: EventFormValues): string {
  if (!values.volunteer_capacity) return "Aucune recherche de bénévoles";
  const suffix = values.volunteer_auto_approve ? " — approbation automatique" : "";
  return `${values.volunteer_capacity}${suffix}`;
}

export function EventStepReview({ values, churches, imagePreviewUrl }: EventStepReviewProps) {
  const isOnSite = values.format === "presentiel" || values.format === "hybride";
  const isOnline = values.format === "en_ligne" || values.format === "hybride";

  return (
    <div className={styles.reviewList}>
      <Row label="Titre" value={values.title} />
      <Row label="Catégorie" value={values.category} />
      <Row label="Description" value={values.description} />
      <Row label="Date de début" value={dateLabel(values.date_start)} />
      <Row label="Date de fin" value={dateLabel(values.date_end)} />
      <Row label="Format" value={FORMAT_LABELS[values.format]} />
      {isOnSite && <Row label="Lieu" value={values.location} />}
      {isOnline && <Row label="Lien de connexion" value={values.online_link} />}
      <Row label="Église organisatrice" value={churchLabel(churches, values.church_id)} />
      <Row label="District" value={values.district} />
      <Row label="Formateur" value={values.instructor} />
      <Row label="Catégorie d'intervenant" value={values.intervenant_category} />
      <Row label="Prix" value={eventPriceLabel(values.price)} />
      {values.price > 0 && <Row label="Formulaire Zeffy" value={values.zeffy_form_path} />}
      <Row label="Places maximum" value={values.capacity ?? "Illimité"} />
      <Row
        label="Nombre d'inscrits visible publiquement"
        value={values.show_registration_count ? "Oui" : "Non"}
      />
      <Row label="Statut" value={STATUS_LABELS[values.status]} />
      <Row
        label="Délai d'annulation"
        value={`${values.cancel_deadline_hours} h avant l'événement`}
      />
      <Row label="Bénévoles souhaités" value={volunteerLabel(values)} />
      <Row
        label="Image de couverture"
        value={
          imagePreviewUrl && (
            <img src={imagePreviewUrl} alt="" className={styles.reviewImageThumb} />
          )
        }
      />
    </div>
  );
}
