import styles from "../AdminPage.module.css";
import { STATUSES, STATUS_LABELS } from "./sermonLabels";
import type { SermonInput, SermonStatus } from "../../../types";

/** Champs communs au dépôt et à la modification d'un sermon. */
export type SermonCommonFields = Pick<
  SermonInput,
  "title" | "preacher" | "sermon_date" | "series" | "status"
>;

interface SermonFieldsProps {
  values: SermonCommonFields;
  onChange: (patch: Partial<SermonCommonFields>) => void;
}

export function SermonFields({ values, onChange }: SermonFieldsProps) {
  return (
    <>
      <input
        className={styles.input}
        placeholder="Titre *"
        required
        value={values.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />
      <input
        className={styles.input}
        placeholder="Prédicateur *"
        required
        value={values.preacher}
        onChange={(e) => onChange({ preacher: e.target.value })}
      />
      <input
        className={styles.input}
        type="date"
        required
        value={values.sermon_date}
        onChange={(e) => onChange({ sermon_date: e.target.value })}
      />
      <input
        className={styles.input}
        placeholder="Série (optionnel)"
        value={values.series ?? ""}
        onChange={(e) => onChange({ series: e.target.value })}
      />
      <select
        className={styles.select}
        value={values.status}
        onChange={(e) => onChange({ status: e.target.value as SermonStatus })}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>
    </>
  );
}
