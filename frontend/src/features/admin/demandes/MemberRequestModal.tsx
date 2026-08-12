import styles from "../AdminPage.module.css";
import { STATUSES, STATUS_LABELS } from "./memberRequestLabels";
import type { MemberRequestAdmin, MemberRequestStatus } from "../../../types";

interface MemberRequestModalProps {
  request: MemberRequestAdmin;
  status: MemberRequestStatus;
  onStatusChange: (status: MemberRequestStatus) => void;
  response: string;
  onResponseChange: (response: string) => void;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function MemberRequestModal({
  request,
  status,
  onStatusChange,
  response,
  onResponseChange,
  error,
  saving,
  onClose,
  onSave,
}: MemberRequestModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderIcon} aria-hidden>📋</div>
          <div className={styles.modalHeaderText}>
            <h2 className={styles.modalName}>{request.request_type}</h2>
            <span className={styles.modalSubtitle}>
              {request.member_name} · {request.member_email}
            </span>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className={styles.modalBody}>
          <p style={{ whiteSpace: "pre-wrap", marginTop: 0 }}>{request.message}</p>

          <label className={styles.helpText} htmlFor="request-status">Statut</label>
          <select
            id="request-status"
            className={styles.select}
            value={status}
            onChange={(e) => onStatusChange(e.target.value as MemberRequestStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <label
            className={styles.helpText}
            htmlFor="request-response"
            style={{ marginTop: "0.75rem", display: "block" }}
          >
            Réponse au membre
          </label>
          <textarea
            id="request-response"
            className={styles.input}
            rows={4}
            placeholder="Votre réponse (envoyée par courriel à la résolution)…"
            value={response}
            onChange={(e) => onResponseChange(e.target.value)}
          />
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
          <button type="button" className={styles.btnPrimary} onClick={onSave} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
