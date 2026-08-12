import { useRef, useState } from "react";
import styles from "./CoverUpload.module.css";

interface CoverUploadProps {
  /** URL déjà résolue de l'image enregistrée, `null` s'il n'y en a pas. */
  currentUrl?: string | null;
  previewFile: File | null;
  onFileChange: (file: File | null) => void;
  /** Absent quand l'entité n'existe pas encore : rien à supprimer côté serveur. */
  onRemove?: () => void;
}

/** Zone de dépôt et prévisualisation d'une image de couverture. */
export function CoverUpload({ currentUrl, previewFile, onFileChange, onRemove }: CoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const resolvedCurrent = currentUrl ?? null;
  const preview = previewFile ? URL.createObjectURL(previewFile) : resolvedCurrent;

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    onFileChange(file);
  }

  return (
    <div className={styles.coverZone} style={{ gridColumn: "1 / -1" }}>
      <label className={styles.coverLabel}>Image de couverture (optionnel)</label>

      {preview ? (
        <div className={styles.previewWrap}>
          <img src={preview} alt="Aperçu couverture" className={styles.previewImg} />
          <div className={styles.previewActions}>
            <button type="button" className={styles.previewBtn}
              onClick={() => inputRef.current?.click()}>
              Changer
            </button>
            {(previewFile || resolvedCurrent) && onRemove && (
              <button type="button" className={`${styles.previewBtn} ${styles.previewBtnDanger}`}
                onClick={() => { onFileChange(null); onRemove(); }}>
                Supprimer
              </button>
            )}
            {previewFile && !resolvedCurrent && (
              <button type="button" className={`${styles.previewBtn} ${styles.previewBtnDanger}`}
                onClick={() => { onFileChange(null); }}>
                Annuler
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`${styles.dropZone} ${dragOver ? styles.dropZoneDrag : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        >
          <span className={styles.dropIcon}>🖼</span>
          <p className={styles.dropText}>Glisser une image ici ou <span>cliquer pour parcourir</span></p>
          <p className={styles.dropHint}>JPG, PNG, WebP — recommandé : 1200 × 630 px</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
