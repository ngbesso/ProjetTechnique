import styles from "./SiteHeader.module.css";
import {
  adminActionLabel,
  adminActionTarget,
  hasAdminAccess,
  isTrueAdmin,
  useAuth,
} from "../../context/AuthContext";
import { Link, useNavigate } from "../../context/RouterContext";
import type { Page } from "../../types";

interface SiteHeaderProps {
  activePage?: Page;
}

const NAV_ITEMS: { label: string; page: Page }[] = [
  { label: "Accueil", page: "home" },
  { label: "Leadership", page: "leadership" },
  { label: "Sermons", page: "sermons" },
  { label: "Blog", page: "blog" },
  { label: "Événements", page: "evenements" },
  { label: "Faire un don", page: "donation" },
];

function navClass(active: boolean): string {
  return active ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;
}

export function SiteHeader({ activePage }: SiteHeaderProps) {
  const { user, member, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = hasAdminAccess(user);
  const displayName = member
    ? `${member.first_name} ${member.last_name}`
    : user?.email;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link page="home" className={styles.logo}>
          <div className={styles.logoIcon}>+</div>
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>Mission Évangélique</span>
            <span className={styles.logoSubtitle}>unis dans la foi</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className={styles.nav} aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => (
            <Link key={item.label} page={item.page} className={navClass(activePage === item.page)}>
              {item.label}
            </Link>
          ))}
<<<<<<< HEAD
=======

          {/* Session admin uniquement : ne peut pas vivre dans NAV_ITEMS (constante
              hors composant, sans accès à la session) — rendu conditionnel ici. */}
          {isAdmin && (
            <Link
              page={adminActionTarget(user)}
              className={navClass(activePage === "admin" || activePage === "organiser-evenements")}
            >
              {adminActionLabel(user)}
            </Link>
          )}
>>>>>>> 6bb759fa9ee1180c6532f0f6f013d025302e3c37
        </nav>

        {/* Actions */}
        <div className={styles.actions}>
          {user ? (
            <>
<<<<<<< HEAD
              {isAdmin ? (
                <button
                  className={`${styles.userName} ${styles.userNameClickable}`}
                  title="Aller à l'administration"
                  onClick={() => navigate("admin")}
                >
                  <span aria-hidden>&#128100;</span> Admin
=======
              <span className={styles.userName} title={user.email}>
                <span aria-hidden>&#128100;</span> {isTrueAdmin(user) ? "Admin" : displayName}
              </span>
              {member && (
                <button className={styles.btnPrimary} onClick={() => navigate("espace")}>
                  Mon espace
>>>>>>> 6bb759fa9ee1180c6532f0f6f013d025302e3c37
                </button>
              ) : (
                <>
                  <span className={styles.userName} title={user.email}>
                    <span aria-hidden>&#128100;</span> {displayName}
                  </span>
                  <button className={styles.btnPrimary} onClick={() => navigate("espace")}>
                    Mon espace
                  </button>
                </>
              )}
              <button className={styles.linkMuted} onClick={logout}>
                Se déconnecter
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
