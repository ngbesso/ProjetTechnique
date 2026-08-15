import styles from "../LeadershipPanel.module.css";
import { LeaderAssignmentFields } from "./LeaderAssignmentFields";
import { LeaderContactFields } from "./LeaderContactFields";
import { LeaderIdentityFields } from "./LeaderIdentityFields";
import type { Church, LeaderInput, ParameterValue } from "../../../types";

interface LeaderFormModalProps {
  /** La modale rend toute la fiche : elle en reçoit donc tous les champs. */
  value: LeaderInput;
  onChange: (patch: Partial<LeaderInput>) => void;
  isEditing: boolean;
  churches: Church[];
  roleValues: ParameterValue[];
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function LeaderFormModal({
  value,
  onChange,
  isEditing,
  churches,
  roleValues,
  error,
  saving,
  onClose,
  onSubmit,
}: LeaderFormModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.formCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.formHeader}>
          <div className={styles.formHeaderIcon} aria-hidden>{isEditing ? "✏️" : "🧑‍💼"}</div>
          <div>
            <p className={styles.formHeaderTitle}>
              {isEditing ? "Modifier le membre" : "Ajouter un membre du leadership"}
            </p>
            <p className={styles.formHeaderSub}>
              {isEditing
                ? "Modifiez les informations ci-dessous puis enregistrez."
                : "Remplissez les informations du nouveau membre du leadership."}
            </p>
          </div>
          <button type="button" className={styles.formHeaderClose} onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className={styles.formBody}>
          <div className={styles.grid2}>
            <LeaderIdentityFields
              values={{
                first_name: value.first_name,
                last_name: value.last_name,
                title: value.title,
                role: value.role,
                district: value.district,
              }}
              onChange={onChange}
              roleValues={roleValues}
            />
            <LeaderAssignmentFields
              values={{
                church_id: value.church_id,
                years_of_service: value.years_of_service,
              }}
              onChange={onChange}
              churches={churches}
            />
            <LeaderContactFields
              values={{ email: value.email, phone: value.phone, bio: value.bio }}
              onChange={onChange}
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
                : "+ Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
