import styles from "./OrganiserEvenementsPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { EvenementsPanel } from "../admin/EvenementsPanel";

export function OrganiserEvenementsPage() {
  const { user, member, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = member
    ? `${member.first_name} ${member.last_name}`
    : user?.email;

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <h1 className={styles.title}>Organiser mes événements</h1>
        <div className={styles.actions}>
          <span className={styles.userBadge} title={user?.email}>
            <span aria-hidden>&#128100;</span> {displayName}
          </span>
          <button className={styles.backBtn} onClick={() => navigate("home")}>
            ← Site public
          </button>
          <button className={styles.logoutBtn} onClick={logout}>
            Déconnexion
          </button>
        </div>
      </header>

      <main className={styles.content}>
        <EvenementsPanel />
      </main>
    </div>
  );
}
