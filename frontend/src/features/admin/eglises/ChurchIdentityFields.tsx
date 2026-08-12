import styles from "../EglisesPanel.module.css";
import type { ChurchInput, District, ParameterValue } from "../../../types";

export type IdentityFields = Pick<ChurchInput, "name" | "district" | "pastor_name">;

interface ChurchIdentityFieldsProps {
  values: IdentityFields;
  onChange: (patch: Partial<IdentityFields>) => void;
  districtValues: ParameterValue[];
}

export function ChurchIdentityFields({
  values,
  onChange,
  districtValues,
}: ChurchIdentityFieldsProps) {
  return (
    <>
      <div className={styles.sectionDivider}>
        <p className={styles.sectionLabel}>Identification</p>
      </div>

      <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
        <label className={styles.label}>
          Nom officiel <span className={styles.required}>*</span>
        </label>
        <input
          className={styles.input}
          placeholder="ex. : Église Évangile Vivant"
          required
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>District</label>
        <select
          className={styles.select}
          value={values.district ?? ""}
          onChange={(e) => onChange({ district: (e.target.value || null) as District | null })}
        >
          <option value="">Sélectionner un district…</option>
          {districtValues.map((d) => (
            <option key={d.id} value={d.label}>{d.label}</option>
          ))}
        </select>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Pasteur / représentant</label>
        <input
          className={styles.input}
          placeholder="ex. : Pasteur Jean Dupont"
          value={values.pastor_name ?? ""}
          onChange={(e) => onChange({ pastor_name: e.target.value })}
        />
      </div>
    </>
  );
}
