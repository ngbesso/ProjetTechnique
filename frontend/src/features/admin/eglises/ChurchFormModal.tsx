import styles from "../EglisesPanel.module.css";
import { ChurchContactFields } from "./ChurchContactFields";
import { ChurchIdentityFields } from "./ChurchIdentityFields";
import type { ChurchFieldErrors } from "./churchValidation";
import type { ChurchInput, ParameterValue } from "../../../types";

interface ChurchFormModalProps {
  /** La modale rend toute la fiche : elle en reçoit donc tous les champs. */
  value: ChurchInput;
  onChange: (patch: Partial<ChurchInput>) => void;
  isEditing: boolean;
  districtValues: ParameterValue[];
  fieldErrors: ChurchFieldErrors;
  onClearFieldError: (key: keyof ChurchFieldErrors) => void;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function ChurchFormModal({
  value,
  onChange,
  isEditing,
  districtValues,
  fieldErrors,
  onClearFieldError,
  error,
  saving,
  onClose,
  onSubmit,
}: ChurchFormModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.formCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.formHeader}>
          <div className={styles.formHeaderIcon} aria-hidden>{isEditing ? "✏️" : "🏛"}</div>
          <div>
            <p className={styles.formHeaderTitle}>
              {isEditing ? "Modifier l'église" : "Ajouter une église affiliée"}
            </p>
            <p className={styles.formHeaderSub}>
              {isEditing
                ? "Modifiez les informations ci-dessous puis enregistrez."
                : "Remplissez les informations de la nouvelle église affiliée."}
            </p>
          </div>
          <button type="button" className={styles.formHeaderClose} onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className={styles.formBody}>
          <div className={styles.grid2}>
            <ChurchIdentityFields
              values={{
                name: value.name,
                district: value.district,
                pastor_name: value.pastor_name,
              }}
              onChange={onChange}
              districtValues={districtValues}
            />
            <ChurchContactFields
              values={{ address: value.address, phone: value.phone, email: value.email }}
              onChange={onChange}
              errors={fieldErrors}
              onClearError={onClearFieldError}
            />
          </div>

          {error && (
            <div className={styles.errorBanner} role="alert">
              <span className={styles.errorBannerIcon} aria-hidden>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className={styles.formActions}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving
                ? "Enregistrement…"
                : isEditing
                ? "✓ Enregistrer les modifications"
                : "+ Ajouter l'église"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
