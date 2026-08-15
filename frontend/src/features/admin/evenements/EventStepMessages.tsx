import styles from "../EvenementsPanel.module.css";
import { Field } from "../../../components/ui/Field";
import { renderTemplate } from "../../../lib/template";
import { DEFAULT_CONFIRMATION_MESSAGE, DEFAULT_REMINDER_MESSAGE } from "./eventDefaults";
import type { EventFormValues } from "./eventDefaults";

/** Champs modifiables par cette étape. */
export type MessagesFields = Pick<
  EventFormValues,
  "cancel_deadline_hours" | "confirmation_message" | "reminder_message"
>;

interface EventStepMessagesProps {
  values: MessagesFields;
  onChange: (patch: Partial<MessagesFields>) => void;
  /** Lus seulement pour composer l'aperçu, jamais modifiés ici. */
  preview: Pick<EventFormValues, "title" | "date_start">;
}

const FALLBACK_DATE = "15 août 2026";
const VARIABLES = ["{prenom}", "{titre}", "{date}", "{delai}"];

export function EventStepMessages({ values, onChange, preview }: EventStepMessagesProps) {
  // Valeurs de démonstration calculées une fois pour les deux aperçus ; la
  // substitution elle-même vient de lib/template.
  const demoValues = {
    prenom: "Jean",
    titre: preview.title || "Titre de l'événement",
    date: preview.date_start
      ? new Date(preview.date_start).toLocaleDateString("fr-CA", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : FALLBACK_DATE,
    delai: String(values.cancel_deadline_hours),
  };

  return (
    <div className={styles.grid2}>
      <Field label="Délai d'annulation (heures avant l'événement)">
        <input
          className={styles.input}
          type="number"
          min={0}
          value={values.cancel_deadline_hours}
          onChange={(e) =>
            onChange({ cancel_deadline_hours: e.target.value ? Number(e.target.value) : 0 })
          }
        />
      </Field>

      <div className={styles.fullWidth}>
        <Field label="Message de confirmation d'inscription">
          <textarea
            className={styles.textarea}
            placeholder={DEFAULT_CONFIRMATION_MESSAGE}
            value={values.confirmation_message}
            onChange={(e) => onChange({ confirmation_message: e.target.value })}
          />
        </Field>
        <p className={styles.imageHint}>Variables disponibles : {VARIABLES.join(", ")}</p>
        {values.confirmation_message && (
          <p className={styles.imageHint}>
            <strong>Aperçu :</strong> {renderTemplate(values.confirmation_message, demoValues)}
          </p>
        )}
      </div>

      <div className={styles.fullWidth}>
        <Field label="Message de rappel">
          <textarea
            className={styles.textarea}
            placeholder={DEFAULT_REMINDER_MESSAGE}
            value={values.reminder_message}
            onChange={(e) => onChange({ reminder_message: e.target.value })}
          />
        </Field>
        <p className={styles.imageHint}>Variables disponibles : {VARIABLES.join(", ")}</p>
        {values.reminder_message && (
          <p className={styles.imageHint}>
            <strong>Aperçu :</strong> {renderTemplate(values.reminder_message, demoValues)}
          </p>
        )}
      </div>
    </div>
  );
}
