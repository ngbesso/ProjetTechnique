import styles from "../LeadershipPanel.module.css";
import { DISTRICTS } from "../../../types";
import type { District, LeaderInput, ParameterValue } from "../../../types";

export type IdentityFields = Pick<
  LeaderInput,
  "first_name" | "last_name" | "title" | "role" | "district"
>;

interface LeaderIdentityFieldsProps {
  values: IdentityFields;
  onChange: (patch: Partial<IdentityFields>) => void;
  roleValues: ParameterValue[];
}

export function LeaderIdentityFields({ values, onChange, roleValues }: LeaderIdentityFieldsProps) {
  return (
    <>
      <div className={styles.sectionDivider}>
        <p className={styles.sectionLabel}>Identité</p>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>
          Prénom <span className={styles.required}>*</span>
        </label>
        <input
          className={styles.input}
          required
          value={values.first_name}
          onChange={(e) => onChange({ first_name: e.target.value })}
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>
          Nom <span className={styles.required}>*</span>
        </label>
        <input
          className={styles.input}
          required
          value={values.last_name}
          onChange={(e) => onChange({ last_name: e.target.value })}
        />
      </div>

      <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
        <label className={styles.label}>
          Titre <span className={styles.required}>*</span>
        </label>
        <input
          className={styles.input}
          placeholder="ex. : Pasteur Principal"
          required
          value={values.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Rôle</label>
        <select
          className={styles.select}
          value={values.role}
          onChange={(e) => onChange({ role: e.target.value })}
        >
          <option value="" disabled>Sélectionner…</option>
          {roleValues.map((r) => (
            <option key={r.id} value={r.label}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>District</label>
        <select
          className={styles.select}
          value={values.district ?? ""}
          onChange={(e) => onChange({ district: (e.target.value || null) as District | null })}
        >
          <option value="">Aucun district</option>
          {DISTRICTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
    </>
  );
}
