import styles from "../EventsPage.module.css";
import { CancelDeadlineNotice } from "./CancelDeadlineNotice";
import type { CancelDeadlineInfo } from "../../../lib/eventPolicy";

interface EventCancelByTokenPanelProps {
  state: "idle" | "submitting" | "done" | "error";
  error: string;
  deadline: CancelDeadlineInfo;
  onConfirm: () => void;
}

export function EventCancelByTokenPanel({
  state,
  error,
  deadline,
  onConfirm,
}: EventCancelByTokenPanelProps) {
  if (state === "done") {
    return <p className={styles.successMsg}>Votre inscription a été annulée.</p>;
  }

  return (
    <>
      <CancelDeadlineNotice deadline={deadline} />
      {!deadline.passed && (
        <button
          className={styles.btnCancel}
          onClick={onConfirm}
          disabled={state === "submitting"}
        >
          {state === "submitting" ? "Traitement…" : "Confirmer l'annulation de mon inscription"}
        </button>
      )}
      {error && (
        <p className={styles.errorMsg} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
