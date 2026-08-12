import styles from "../AdminPage.module.css";
import { SermonFields } from "./SermonFields";
import { mediaFormatLabel } from "./sermonLabels";
import type { Sermon, SermonInput } from "../../../types";

interface SermonEditModalProps {
  sermon: Sermon;
  value: SermonInput;
  onChange: (patch: Partial<SermonInput>) => void;
  /** Remplacement facultatif : sans fichier, le média existant est conservé. */
  onFileChange: (file: File | null) => void;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function SermonEditModal({
  sermon,
  value,
  onChange,
  onFileChange,
  error,
  saving,
  onClose,
  onSubmit,
}: SermonEditModalProps) {
  const currentFormat = mediaFormatLabel(sermon.format);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderIcon} aria-hidden>✏️</div>
          <div className={styles.modalHeaderText}>
            <h2 className={styles.modalName}>Modifier le sermon</h2>
            <span className={styles.modalSubtitle}>
              {currentFormat} · {sermon.sermon_date}
            </span>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <form id="editSermonForm" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <div className={styles.modalBody}>
            <div className={styles.formGrid}>
              <SermonFields values={value} onChange={onChange} />
              <textarea
                className={styles.input}
                placeholder="Description (optionnel)"
                value={value.description ?? ""}
                rows={3}
                onChange={(e) => onChange({ description: e.target.value })}
              />
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>
                  Remplacer le fichier média (optionnel)
                </label>
                <input
                  className={styles.input}
                  type="file"
                  accept="audio/*,video/*"
                  onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                />
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Actuel : {currentFormat} — laissez vide pour conserver le fichier existant.
                </p>
              </div>
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
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
