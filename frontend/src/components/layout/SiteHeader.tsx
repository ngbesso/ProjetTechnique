import styles from "./SiteHeader.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import type { Page } from "../../types";

interface SiteHeaderProps {
  activePage?: Page;
}

const NAV_ITEMS: { label: string; page: Page | null; anchor?: string }[] = [
  { label: "Accueil", page: "home" },
  { label: "Sermons", page: "sermons" },
  { label: "Blog", page: "blog" },
  { label: "Événements", page: null },
  { label: "Formation", page: null, anchor: "formation" },
  { label: "Faire un don", page: "donation" },
];

export function SiteHeader({ activePage }: SiteHeaderProps) {
  const { user, member, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.is_global_admin || user?.roles.includes("admin");
  const displayName = member
    ? `${member.first_name} ${member.last_name}`
    : user?.email;

  function goToSection(anchor: string) {
    if (activePage === "home") {
      document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
    } else {
      // Depuis une autre page : revenir à l'accueil puis défiler vers la section
      navigate("home");
      setTimeout(() => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  }

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
              onClick={() => {
                if (item.anchor) goToSection(item.anchor);
                else if (item.page) navigate(item.page);
              }}
              disabled={item.page === null && !item.anchor}
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
