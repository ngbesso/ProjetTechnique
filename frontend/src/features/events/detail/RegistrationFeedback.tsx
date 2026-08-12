import styles from "../EventsPage.module.css";

interface RegistrationFeedbackProps {
  error: string;
  message: string;
  /** Communiqué seulement une fois l'inscription confirmée. */
  onlineLink: string | null;
}

export function RegistrationFeedback({ error, message, onlineLink }: RegistrationFeedbackProps) {
  return (
    <>
      {error && (
        <p className={styles.errorMsg} role="alert">
          {error}
        </p>
      )}
      {message && <p className={styles.successMsg}>{message}</p>}
      {onlineLink && (
        <p className={styles.successMsg}>
          Lien de connexion :{" "}
          <a href={onlineLink} target="_blank" rel="noreferrer">
            {onlineLink}
          </a>
        </p>
      )}
    </>
  );
}
