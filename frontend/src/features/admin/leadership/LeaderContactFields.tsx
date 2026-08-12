import styles from "../LeadershipPanel.module.css";
import type { LeaderInput } from "../../../types";

export type ContactFields = Pick<LeaderInput, "email" | "phone" | "bio">;

interface LeaderContactFieldsProps {
  values: ContactFields;
  onChange: (patch: Partial<ContactFields>) => void;
}

export function LeaderContactFields({ values, onChange }: LeaderContactFieldsProps) {
  return (
    <>
      <div className={styles.sectionDivider}>
        <p className={styles.sectionLabel}>Coordonnées et biographie</p>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Courriel (public)</label>
        <input
          className={styles.input}
          type="email"
          value={values.email ?? ""}
          onChange={(e) => onChange({ email: e.target.value })}
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Téléphone (public)</label>
        <input
          className={styles.input}
          type="tel"
          value={values.phone ?? ""}
          onChange={(e) => onChange({ phone: e.target.value })}
        />
      </div>

      <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
        <label className={styles.label}>Biographie</label>
        <textarea
          className={styles.textarea}
          placeholder="Courte biographie publique (optionnel)"
          value={values.bio ?? ""}
          onChange={(e) => onChange({ bio: e.target.value })}
        />
      </div>
    </>
  );
}
