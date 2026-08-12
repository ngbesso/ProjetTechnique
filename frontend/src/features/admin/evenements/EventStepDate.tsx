import styles from "../EvenementsPanel.module.css";
import { Field } from "../../../components/ui/Field";
import { toLocalInput } from "../../../lib/format";
import { FORMAT_LABELS } from "./eventLabels";
import type { EventFormValues } from "./eventDefaults";
import type { Church, District, EventFormat, ParameterValue } from "../../../types";

export type DateFields = Pick<
  EventFormValues,
  "date_start" | "date_end" | "format" | "online_link" | "location" | "church_id" | "district"
>;

interface EventStepDateProps {
  values: DateFields;
  onChange: (patch: Partial<DateFields>) => void;
  /** Un événement existant peut être daté dans le passé ; un nouveau, non. */
  isEditing: boolean;
  churches: Church[];
  districtValues: ParameterValue[];
}

export function EventStepDate({
  values,
  onChange,
  isEditing,
  churches,
  districtValues,
}: EventStepDateProps) {
  const isOnline = values.format === "en_ligne" || values.format === "hybride";
  const isOnSite = values.format === "presentiel" || values.format === "hybride";
  const halfWidth = values.format === "hybride";

  return (
    <div className={styles.grid2}>
      <Field label="Date de début *">
        <input
          className={styles.input}
          type="datetime-local"
          required
          min={isEditing ? undefined : toLocalInput(new Date().toISOString())}
          value={values.date_start}
          onChange={(e) => onChange({ date_start: e.target.value })}
        />
      </Field>

      <Field label="Date de fin">
        <input
          className={styles.input}
          type="datetime-local"
          // Le sélecteur n'autorise pas de date antérieure au début. Le backend
          // applique déjà la règle (end_after_start), mais l'erreur
          // n'apparaîtrait qu'à la soumission, plusieurs étapes plus loin.
          min={values.date_start || undefined}
          value={values.date_end}
          onChange={(e) => onChange({ date_end: e.target.value })}
        />
      </Field>

      <Field label="Format">
        <select
          className={styles.select}
          value={values.format}
          onChange={(e) => onChange({ format: e.target.value as EventFormat })}
        >
          {(Object.keys(FORMAT_LABELS) as EventFormat[]).map((f) => (
            <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
          ))}
        </select>
      </Field>

      {isOnline && (
        <div className={halfWidth ? undefined : styles.fullWidth}>
          <Field label="Lien de connexion *">
            <input
              className={styles.input}
              placeholder="ex. : https://zoom.us/j/123456789"
              value={values.online_link}
              onChange={(e) => onChange({ online_link: e.target.value })}
            />
          </Field>
        </div>
      )}
      {isOnSite && (
        <div className={halfWidth ? undefined : styles.fullWidth}>
          <Field label="Lieu *">
            <input
              className={styles.input}
              placeholder="ex. : Centre de plein air, Sainte-Adèle"
              value={values.location}
              onChange={(e) => onChange({ location: e.target.value })}
            />
          </Field>
        </div>
      )}

      <Field label="Église organisatrice">
        <select
          className={styles.select}
          value={values.church_id ?? ""}
          onChange={(e) => onChange({ church_id: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">Toute la mission</option>
          {churches.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <Field label="District">
        <select
          className={styles.select}
          value={values.district ?? ""}
          onChange={(e) => onChange({ district: (e.target.value || null) as District | null })}
        >
          <option value="">Aucun district</option>
          {districtValues.map((d) => (
            <option key={d.id} value={d.label}>{d.label}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}
