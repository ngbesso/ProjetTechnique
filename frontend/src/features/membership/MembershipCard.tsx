import styles from "./MembershipPage.module.css";

/** Carte à l'en-tête de marque, commune au formulaire et aux messages finaux. */
export function MembershipCard({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.card}>
      <div className={styles.brandBar}>
        <div className={styles.brandIcon} aria-hidden>+</div>
        <div>
          <p className={styles.brandName}>Mission Évangélique</p>
          <p className={styles.brandSub}>Devenir membre</p>
        </div>
      </div>
      {children}
    </div>
  );
}

interface MembershipSuccessProps {
  title: string;
  children: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
}

/** Message de fin de parcours : adhésion approuvée, demande reçue, déjà membre. */
export function MembershipSuccess({
  title,
  children,
  actionLabel,
  onAction,
}: MembershipSuccessProps) {
  return (
    <div className={styles.body}>
      <div className={styles.successBox}>
        <p className={styles.successIcon} aria-hidden>✓</p>
        <h2 className={styles.successTitle}>{title}</h2>
        <p className={styles.successText}>{children}</p>
        <button className={styles.submit} onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
