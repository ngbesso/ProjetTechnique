import admin from "../../admin/AdminPage.module.css";
import styles from "../EspacePage.module.css";
import type { ContactErrors } from "./useMyProfile";
import type { Member, ParameterValue } from "../../../types";

export type ContactFields = Pick<Member, "address" | "telephone" | "family_status">;

interface ProfileContactFormProps {
  values: ContactFields;
  onChange: (patch: Partial<ContactFields>) => void;
  errors: ContactErrors;
  /** L'erreur d'un champ disparaît dès qu'on le corrige. */
  onClearError: (key: keyof ContactErrors) => void;
  familyOptions: ParameterValue[];
  busy: boolean;
  onSubmit: () => void;
}

export function ProfileContactForm({
  values,
  onChange,
  errors,
  onClearError,
  familyOptions,
  busy,
  onSubmit,
}: ProfileContactFormProps) {
  return (
    <section className={admin.card}>
      <h3 className={admin.cardTitle}>Modifier mes coordonnées</h3>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <div className={styles.grid2}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="address">Adresse</label>
            <input
              id="address"
              className={admin.input}
              value={values.address ?? ""}
              placeholder="ex. : 123 Rue principale, Montréal, QC"
              onChange={(e) => {
                onChange({ address: e.target.value || null });
                onClearError("address");
              }}
            />
            {errors.address && <p className={admin.fieldError}>{errors.address}</p>}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="telephone">Téléphone</label>
            <input
              id="telephone"
              className={admin.input}
              type="tel"
              value={values.telephone ?? ""}
              placeholder="ex. : 514-123-4567"
              onChange={(e) => {
                onChange({ telephone: e.target.value || null });
                onClearError("telephone");
              }}
            />
            {errors.telephone && <p className={admin.fieldError}>{errors.telephone}</p>}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="family_status">Statut matrimonial</label>
            <select
              id="family_status"
              className={admin.select}
              value={values.family_status ?? ""}
              onChange={(e) => onChange({ family_status: e.target.value || null })}
            >
              <option value="">—</option>
              {familyOptions.map((f) => (
                <option key={f.id} value={f.label}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={admin.btnPrimary} disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </section>
  );
}
