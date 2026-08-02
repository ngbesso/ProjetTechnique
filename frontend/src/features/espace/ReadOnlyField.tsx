import styles from "./EspacePage.module.css";

/** Champ en lecture seule de l'espace membre : cadenas explicite, valeur non
 *  éditable. Les informations d'identité ne se modifient que via une demande
 *  à l'église (voir DemandesSection). */
export function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.fieldGroup}>
      <label className={styles.label}>
        {label} <span className={styles.lockIcon} aria-hidden>🔒</span>
      </label>
      <div className={styles.readOnlyValue}>{value || "—"}</div>
    </div>
  );
}
