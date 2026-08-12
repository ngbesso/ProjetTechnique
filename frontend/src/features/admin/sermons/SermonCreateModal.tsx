import styles from "../AdminPage.module.css";
import { SermonFields } from "./SermonFields";
import type { SermonInput } from "../../../types";

interface SermonCreateModalProps {
  value: SermonInput;
  onChange: (patch: Partial<SermonInput>) => void;
  /** Le média est obligatoire au dépôt : sans lui il n'y a pas de sermon. */
  onFileChange: (file: File | null) => void;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function SermonCreateModal({
  value,
  onChange,
  onFileChange,
  error,
  saving,
  onClose,
  onSubmit,
}: SermonCreateModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderIcon} aria-hidden>🎙</div>
          <div className={styles.modalHeaderText}>
            <h2 className={styles.modalName}>Ajouter un sermon</h2>
            <span className={styles.modalSubtitle}>Remplissez les informations du nouveau sermon.</span>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <div className={styles.modalBody}>
            <div className={styles.formGrid}>
              <SermonFields values={value} onChange={onChange} />
              <input
                className={styles.input}
                type="file"
                accept="audio/*,video/*"
                required
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
              <textarea
                className={styles.input}
                placeholder="Description (optionnel)"
                value={value.description ?? ""}
                onChange={(e) => onChange({ description: e.target.value })}
              />
            </div>
            {error && (
              <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>
                {error}
              </p>
            )}
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Envoi en cours…" : "+ Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
