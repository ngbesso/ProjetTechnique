import { useEffect, useRef, useState } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  const isAdmin = hasAdminAccess(user);
  const displayName = member
    ? `${member.first_name} ${member.last_name}`
    : user?.email;

  // Échap ferme le panneau mobile ; tant qu'il est ouvert, la page derrière ne
  // défile pas (le panneau occupe tout l'écran).
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    // Clic en dehors du panneau : le seul « dehors » visible est la bande de
    // l'en-tête. Le burger est exclu, sinon son propre toggle rouvrirait le
    // panneau juste après cette fermeture.
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || burgerRef.current?.contains(target)) return;
      setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    // Repasser en format bureau masque le panneau en CSS : on le referme aussi
    // côté état, sinon le verrou de défilement resterait actif.
    const desktop = window.matchMedia("(min-width: 769px)");
    const onBreakpoint = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener("change", onBreakpoint);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      desktop.removeEventListener("change", onBreakpoint);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  /** Action du panneau mobile : navigue puis referme le panneau. */
  function mobileAction(run: () => void) {
    return () => {
      run();
      setMobileOpen(false);
    };
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link page="home" className={styles.logo}>
          {siteLogoUrl(settings.site_logo_url) ? (
            <img
              src={siteLogoUrl(settings.site_logo_url)!}
              alt={settings.site_name}
              className={styles.logoIcon} aria-hidden
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div className={styles.logoIcon} aria-hidden>+</div>
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

        {/* Burger — seul point d'entrée de la navigation sous 768px */}
        <button
          ref={burgerRef}
          type="button"
          className={styles.burger}
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={mobileOpen}
          aria-controls="menu-mobile"
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span aria-hidden>{mobileOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {mobileOpen && (
        <div className={styles.mobilePanel} id="menu-mobile" ref={panelRef}>
          <nav className={styles.mobileNav} aria-label="Navigation principale (mobile)">
            {menu.map((item) => (
              <Link
                key={item.id}
                page={item.target_page as Page}
                className={
                  activePage === item.target_page
                    ? `${styles.mobileLink} ${styles.mobileLinkActive}`
                    : styles.mobileLink
                }
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={styles.mobileActions}>
            {user ? (
              <>
                <span className={styles.mobileUser}>
                  <span aria-hidden>&#128100;</span> {isTrueAdmin(user) ? "Admin" : displayName}
                </span>
                {member && (
                  <button
                    className={styles.btnPrimary}
                    onClick={mobileAction(() => navigate("espace"))}
                  >
                    Mon espace
                  </button>
                )}
                {isAdmin && (
                  <button
                    className={styles.btnSecondary}
                    onClick={mobileAction(() => navigate(adminActionTarget(user)))}
                  >
                    {adminActionLabel(user)}
                  </button>
                )}
                <button className={styles.linkMuted} onClick={mobileAction(logout)}>
                  Se déconnecter
                </button>
              </>
            ) : (
              <>
                <button
                  className={styles.btnSecondary}
                  onClick={mobileAction(() => navigate("login"))}
                >
                  <span aria-hidden>&#128100;</span> Se connecter
                </button>
                <button
                  className={styles.btnPrimary}
                  onClick={mobileAction(() => navigate("adhesion"))}
                >
                  Devenir membre
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
