import styles from "../EglisesPanel.module.css";
import type { ChurchFieldErrors } from "./churchValidation";
import type { ChurchInput } from "../../../types";

export type ContactFields = Pick<ChurchInput, "address" | "phone" | "email">;

interface ChurchContactFieldsProps {
  values: ContactFields;
  onChange: (patch: Partial<ContactFields>) => void;
  errors: ChurchFieldErrors;
  /** L'erreur d'un champ disparaît dès qu'on le corrige. */
  onClearError: (key: keyof ChurchFieldErrors) => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className={styles.fieldError} role="alert">
      <span>⚠</span> {message}
    </p>
  );
}

export function ChurchContactFields({
  values,
  onChange,
  errors,
  onClearError,
}: ChurchContactFieldsProps) {
  return (
    <>
      <div className={styles.sectionDivider}>
        <p className={styles.sectionLabel}>Coordonnées</p>
      </div>

      <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
        <label className={styles.label}>Adresse</label>
        <input
          className={`${styles.input} ${errors.address ? styles.inputError : ""}`}
          placeholder="ex. : 123 Rue principale, Montréal, QC"
          value={values.address ?? ""}
          onChange={(e) => { onChange({ address: e.target.value }); onClearError("address"); }}
        />
        <FieldError message={errors.address} />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Téléphone</label>
        <input
          className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
          placeholder="ex. : 514-123-4567"
          type="tel"
          value={values.phone ?? ""}
          onChange={(e) => { onChange({ phone: e.target.value }); onClearError("phone"); }}
        />
        <FieldError message={errors.phone} />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Courriel</label>
        <input
          className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
          type="email"
          placeholder="ex. : eglise@exemple.com"
          value={values.email ?? ""}
          onChange={(e) => { onChange({ email: e.target.value }); onClearError("email"); }}
        />
        <FieldError message={errors.email} />
      </div>
    </>
  );
}
