import styles from "./SiteHeader.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import type { Page } from "../../types";

interface SiteHeaderProps {
  activePage?: Page;
}

const NAV_ITEMS = [
  { label: "Accueil", page: "home" as Page },
  { label: "Sermons", page: "sermons" as Page },
  { label: "Événements", page: null },
  { label: "Formation", page: null },
  { label: "Faire un don", page: "donation" as Page },
] as const;

export function SiteHeader({ activePage }: SiteHeaderProps) {
  const { user, member, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.is_global_admin || user?.roles.includes("admin");
  const displayName = member
    ? `${member.first_name} ${member.last_name}`
    : user?.email;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Logo */}
        <button className={styles.logo} onClick={() => navigate("home")}>
          <div className={styles.logoIcon}>+</div>
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>Mission Évangélique</span>
            <span className={styles.logoSubtitle}>unis dans la foi</span>
          </div>
        </button>

        {/* Nav */}
        <nav className={styles.nav} aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className={
                activePage === item.page && item.page !== null
                  ? `${styles.navLink} ${styles.navLinkActive}`
                  : styles.navLink
              }
              onClick={() => item.page && navigate(item.page)}
              disabled={item.page === null}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className={styles.actions}>
          {user ? (
            <>
              <span className={styles.userName} title={user.email}>
                <span aria-hidden>&#128100;</span> {displayName}
              </span>
              {isAdmin ? (
                <button
                  className={styles.btnSecondary}
                  onClick={() => navigate("admin")}
                >
                  Administration
                </button>
              ) : (
                <button
                  className={styles.btnSecondary}
                  onClick={() => navigate("mon-profil")}
                >
                  ✏ Modifier mon profil
                </button>
              )}
              <button className={styles.btnPrimary} onClick={logout}>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <button
                className={styles.btnSecondary}
                onClick={() => navigate("login")}
              >
                <span aria-hidden>&#128100;</span> Se connecter
              </button>
              <button
                className={styles.btnPrimary}
                onClick={() => navigate("adhesion")}
              >
                Devenir membre
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
