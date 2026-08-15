import styles from "../EvenementsPanel.module.css";
import { Field } from "../../../components/ui/Field";

interface EventStepImagesProps {
  /** URL affichable : blob local si un fichier vient d'être choisi, sinon
   *  l'image déjà enregistrée. */
  previewUrl: string | null;
  /** Vrai si un fichier a été choisi et reste à envoyer. */
  hasPendingFile: boolean;
  onSelectFile: (file: File) => void;
}

export function EventStepImages({ previewUrl, hasPendingFile, onSelectFile }: EventStepImagesProps) {
  return (
    <div className={styles.imageStepBody}>
      <Field label="Image de couverture">
        <input
          type="file"
          accept="image/*"
          className={styles.input}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelectFile(file);
          }}
        />
      </Field>
      {previewUrl ? (
        <div className={styles.imagePreviewWrap}>
          <img src={previewUrl} alt="Aperçu de l'image de couverture" className={styles.imagePreview} />
        </div>
      ) : (
        <p className={styles.imageHint}>Aucune image sélectionnée — formats acceptés : JPG, PNG, WebP.</p>
      )}
      {hasPendingFile && (
        <p className={styles.imageHint}>Cette image sera envoyée lors de l'enregistrement.</p>
      )}
    </div>
  );
}
