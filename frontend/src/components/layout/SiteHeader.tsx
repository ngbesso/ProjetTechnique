import styles from "./SiteHeader.module.css";
import {
  adminActionLabel,
  adminActionTarget,
  hasAdminAccess,
  isTrueAdmin,
  useAuth,
} from "../../context/AuthContext";
import { Link, useNavigate } from "../../context/RouterContext";
import { useSiteContent } from "../../hooks/useSiteContent";
import { siteLogoUrl } from "../../lib/api/content";
import type { Page } from "../../types";

interface SiteHeaderProps {
  activePage?: Page;
}

function navClass(active: boolean): string {
  return active ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;
}

export function SiteHeader({ activePage }: SiteHeaderProps) {
  const { user, member, logout } = useAuth();
  const navigate = useNavigate();
  const { settings, menu } = useSiteContent();

  const isAdmin = hasAdminAccess(user);
  const displayName = member
    ? `${member.first_name} ${member.last_name}`
    : user?.email;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link page="home" className={styles.logo}>
          {siteLogoUrl(settings.site_logo_url) ? (
            <img
              src={siteLogoUrl(settings.site_logo_url)!}
              alt={settings.site_name}
              className={styles.logoIcon}
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div className={styles.logoIcon}>+</div>
          )}
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>{settings.site_name}</span>
            <span className={styles.logoSubtitle}>{settings.site_tagline}</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className={styles.nav} aria-label="Navigation principale">
          {menu.map((item) => (
            <Link
              key={item.id}
              page={item.target_page as Page}
              className={navClass(activePage === item.target_page)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className={styles.actions}>
          {user ? (
            <>
              <span className={styles.userName} title={user.email}>
                <span aria-hidden>&#128100;</span> {isTrueAdmin(user) ? "Admin" : displayName}
              </span>
              {member && (
                <button className={styles.btnPrimary} onClick={() => navigate("espace")}>
                  Mon espace
                </button>
              )}
              {isAdmin && (
                <button
                  className={member ? styles.btnSecondary : styles.btnPrimary}
                  onClick={() => navigate(adminActionTarget(user))}
                >
                  {adminActionLabel(user)}
                </button>
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
