import styles from "./AdminPage.module.css";

interface AdminTopBarProps {
  title: string;
  pendingCount: number;
  userEmail?: string;
  onShowPending: () => void;
  onLogout: () => void;
}

function pendingTitle(count: number): string {
  if (count === 0) return "Aucune nouvelle demande";
  return `${count} demande${count > 1 ? "s" : ""} en attente`;
}

export function AdminTopBar({
  title,
  pendingCount,
  userEmail,
  onShowPending,
  onLogout,
}: AdminTopBarProps) {
  return (
    <header className={styles.topBar}>
      <h1 className={styles.topTitle}>{title}</h1>
      <div className={styles.topUser}>
        <button
          className={styles.notifBtn}
          title={pendingTitle(pendingCount)}
          onClick={onShowPending}
        >
          🔔
          {pendingCount > 0 && <span className={styles.notifBadge}>{pendingCount}</span>}
        </button>
        <span className={styles.userBadge} title={userEmail}>
          <span aria-hidden>&#128100;</span> Admin
        </span>
        <button className={styles.logoutBtn} onClick={onLogout}>
          Déconnexion
        </button>
      </div>
    </header>
  );
}
