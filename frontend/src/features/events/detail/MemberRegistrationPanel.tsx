import styles from "../EventsPage.module.css";
import { CancelDeadlineNotice } from "./CancelDeadlineNotice";
import type { CancelDeadlineInfo } from "../../../lib/eventPolicy";
import type { RegistrationStatus } from "./useEventRegistration";

interface MemberRegistrationPanelProps {
  status: RegistrationStatus;
  submitting: boolean;
  /** Plus aucune place disponible : l'inscription reste visible mais inactive. */
  isFull: boolean;
  deadline: CancelDeadlineInfo;
  onRegister: () => void;
  onCancel: () => void;
}

export function MemberRegistrationPanel({
  status,
  submitting,
  isFull,
  deadline,
  onRegister,
  onCancel,
}: MemberRegistrationPanelProps) {
  if (status === "confirmed") {
    return (
      <>
        <CancelDeadlineNotice deadline={deadline} />
        {!deadline.passed && (
          <button className={styles.btnCancel} onClick={onCancel} disabled={submitting}>
            {submitting ? "Traitement…" : "Annuler mon inscription"}
          </button>
        )}
      </>
    );
  }

  return (
    <button className={styles.btnRegister} onClick={onRegister} disabled={submitting || isFull}>
      {submitting ? "Traitement…" : "S'inscrire"}
    </button>
  );
}
