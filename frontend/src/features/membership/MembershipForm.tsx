import styles from "./MembershipPage.module.css";
import { YESTERDAY } from "../../lib/format";
import type { MembershipFormState } from "./membershipDefaults";
import type { MembershipFieldErrors } from "./membershipValidation";
import type { Church, ParameterValue } from "../../types";

interface MembershipFormProps {
  /** Le formulaire rend tous les champs de la demande : il les reçoit tous. */
  values: MembershipFormState;
  onChange: (patch: Partial<MembershipFormState>) => void;
  fieldErrors: MembershipFieldErrors;
  /** L'erreur d'un champ disparaît dès qu'on le corrige. */
  onClearFieldError: (key: keyof MembershipFieldErrors) => void;
  churches: Church[];
  sexeOptions: ParameterValue[];
  familyOptions: ParameterValue[];
  error: string;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export function MembershipForm({
  values,
  onChange,
  fieldErrors,
  onClearFieldError,
  churches,
  sexeOptions,
  familyOptions,
  error,
  submitting,
  onSubmit,
  onBack,
}: MembershipFormProps) {
  return (
    <form className={styles.body} onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <p className={styles.intro}>
        Remplissez ce formulaire pour rejoindre l'une des Églises de la mission.
      </p>

      <label className={styles.label}>Église *</label>
      <select className={styles.select} value={values.church_id} required
        onChange={(e) => onChange({ church_id: e.target.value })}>
        <option value="">Choisir une église…</option>
        {churches.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}{c.district ? ` — ${c.district}` : ""}
          </option>
        ))}
      </select>

      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.label}>Prénom *</label>
          <input className={styles.input} required value={values.first_name}
            onChange={(e) => onChange({ first_name: e.target.value })} />
        </div>
        <div className={styles.col}>
          <label className={styles.label}>Nom *</label>
          <input className={styles.input} required value={values.last_name}
            onChange={(e) => onChange({ last_name: e.target.value })} />
        </div>
      </div>

      <label className={styles.label}>Courriel *</label>
      <input className={`${styles.input} ${fieldErrors.email ? styles.inputError : ""}`}
        type="email" required placeholder="vous@exemple.com" value={values.email}
        onChange={(e) => { onChange({ email: e.target.value }); onClearFieldError("email"); }} />
      {fieldErrors.email && <p className={styles.fieldError} role="alert">{fieldErrors.email}</p>}

      <label className={styles.label}>Adresse</label>
      <input className={`${styles.input} ${fieldErrors.address ? styles.inputError : ""}`}
        placeholder="ex. : 123 Rue principale, Montréal, QC" value={values.address}
        onChange={(e) => { onChange({ address: e.target.value }); onClearFieldError("address"); }} />
      {fieldErrors.address && <p className={styles.fieldError} role="alert">{fieldErrors.address}</p>}

      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.label}>Sexe</label>
          <select className={styles.select} value={values.sexe}
            onChange={(e) => onChange({ sexe: e.target.value })}>
            <option value="">—</option>
            {sexeOptions.map((s) => <option key={s.id} value={s.label}>{s.label}</option>)}
          </select>
        </div>
        <div className={styles.col}>
          <label className={styles.label}>Téléphone</label>
          <input className={`${styles.input} ${fieldErrors.telephone ? styles.inputError : ""}`}
            type="tel" value={values.telephone}
            placeholder="ex. : 514-123-4567 ou +1 514 123 4567"
            onChange={(e) => { onChange({ telephone: e.target.value }); onClearFieldError("telephone"); }} />
          {fieldErrors.telephone && (
            <p className={styles.fieldError} role="alert">{fieldErrors.telephone}</p>
          )}
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.label}>Date de naissance</label>
          <input className={styles.input} type="date" value={values.birth_date}
            max={YESTERDAY}
            onChange={(e) => onChange({ birth_date: e.target.value })} />
        </div>
        <div className={styles.col}>
          <label className={styles.label}>Statut matrimonial</label>
          <select className={styles.select} value={values.family_status}
            onChange={(e) => onChange({ family_status: e.target.value })}>
            <option value="">—</option>
            {familyOptions.map((f) => <option key={f.id} value={f.label}>{f.label}</option>)}
          </select>
        </div>
      </div>

      <label className={styles.label}>Baptême</label>
      <div className={styles.radioRow}>
        <label className={styles.radioOption}>
          <input type="radio" name="bapt" checked={!values.is_baptized}
            onChange={() => onChange({ is_baptized: false })} />
          Non baptisé(e)
        </label>
        <label className={styles.radioOption}>
          <input type="radio" name="bapt" checked={values.is_baptized}
            onChange={() => onChange({ is_baptized: true })} />
          Baptisé(e)
        </label>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? "Envoi…" : "Envoyer ma demande"}
      </button>
      <button type="button" className={styles.backLink} onClick={onBack}>
        ← Retour à l'accueil
      </button>
    </form>
  );
}
