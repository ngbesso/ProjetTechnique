import styles from "../LeadershipPanel.module.css";
import type { Church, LeaderInput } from "../../../types";

export type AssignmentFields = Pick<LeaderInput, "church_id" | "years_of_service">;

interface LeaderAssignmentFieldsProps {
  values: AssignmentFields;
  onChange: (patch: Partial<AssignmentFields>) => void;
  churches: Church[];
}

export function LeaderAssignmentFields({
  values,
  onChange,
  churches,
}: LeaderAssignmentFieldsProps) {
  return (
    <>
      <div className={styles.sectionDivider}>
        <p className={styles.sectionLabel}>Affectation et service</p>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Église de rattachement</label>
        <select
          className={styles.select}
          value={values.church_id ?? ""}
          onChange={(e) => onChange({ church_id: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">Aucune (niveau national)</option>
          {churches.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Années de service</label>
        <input
          className={styles.input}
          type="number"
          min={0}
          value={values.years_of_service ?? ""}
          onChange={(e) =>
            onChange({ years_of_service: e.target.value ? Number(e.target.value) : null })
          }
        />
      </div>
    </>
  );
}
