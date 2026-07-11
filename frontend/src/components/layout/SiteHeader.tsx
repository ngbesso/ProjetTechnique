import styles from "./SiteHeader.module.css";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "../../context/RouterContext";
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
        <Link page="home" className={styles.logo}>
          <div className={styles.logoIcon}>+</div>
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>Mission Évangélique</span>
            <span className={styles.logoSubtitle}>unis dans la foi</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className={styles.nav} aria-label="Navigation principale">
          {NAV_ITEMS.map((item) =>
            item.page !== null ? (
              <Link
                key={item.label}
                page={item.page}
                className={
                  activePage === item.page
                    ? `${styles.navLink} ${styles.navLinkActive}`
                    : styles.navLink
                }
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                className={styles.navLink}
                onClick={() => item.anchor && goToSection(item.anchor)}
                disabled={!item.anchor}
              >
                {item.label}
              </button>
            ),
          )}
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
