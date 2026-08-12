import styles from "../EvenementsPanel.module.css";
import { Field } from "../../../components/ui/Field";
import type { EventFormValues } from "./eventDefaults";
import type { ParameterValue } from "../../../types";

/** Seuls les champs de cette étape — pas l'objet de formulaire complet. */
export type InfoFields = Pick<EventFormValues, "title" | "category" | "description">;

interface EventStepInfoProps {
  values: InfoFields;
  onChange: (patch: Partial<InfoFields>) => void;
  categoryValues: ParameterValue[];
}

export function EventStepInfo({ values, onChange, categoryValues }: EventStepInfoProps) {
  return (
    <div className={styles.grid2}>
      <div className={styles.fullWidth}>
        <Field label="Titre *">
          <input
            className={styles.input}
            placeholder="ex. : Camp de jeunes d'été"
            required
            value={values.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Catégorie *">
        <select
          className={styles.select}
          value={values.category}
          onChange={(e) => onChange({ category: e.target.value })}
        >
          <option value="" disabled>Sélectionner…</option>
          {categoryValues.map((c) => (
            <option key={c.id} value={c.label}>{c.label}</option>
          ))}
        </select>
      </Field>

      <div className={styles.fullWidth}>
        <Field label="Description">
          <textarea
            className={styles.textarea}
            placeholder="Description de l'événement (optionnel)"
            value={values.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}
