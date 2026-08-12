import styles from "../EventsPage.module.css";

/** Paiement d'un événement payant, délégué au formulaire Zeffy de l'organisation. */
export function ZeffyPaymentBlock({ formPath }: { formPath: string | null | undefined }) {
  if (!formPath) {
    return (
      <div className={styles.notConfigured}>
        <p>Le paiement pour cet événement n'est pas encore configuré.</p>
      </div>
    );
  }
  return (
    <div className={styles.zeffyWrapper}>
      <iframe
        title="Formulaire de paiement Zeffy"
        src={`https://www.zeffy.com${formPath}`}
        className={styles.zeffyEmbed}
        allowFullScreen
      />
    </div>
  );
}
