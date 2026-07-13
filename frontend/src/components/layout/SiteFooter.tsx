import { useEffect, useState } from "react";
import styles from "./SiteFooter.module.css";
import { useAuth } from "../../context/AuthContext";
import { Link, useGoToSection } from "../../context/RouterContext";
import { fetchChurches } from "../../lib/api/churches";
import type { Church } from "../../types";

// URLs placeholder — à remplacer par les comptes officiels de la mission.
const SOCIAL_LINKS = {
  youtube: "https://youtube.com/@mission",
  facebook: "https://facebook.com/mission",
  instagram: "https://instagram.com/mission",
  whatsapp: "https://wa.me/15145550100",
};

function IconYouTube() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.3 9.2v5.6l5-2.8-5-2.8Z" fill="currentColor" />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M14 8.6h-1.5c-.7 0-1.1.4-1.1 1.2v1.4h2.5l-.35 2.3h-2.15V19h-2.3v-5.5H7.4v-2.3h1.7V9.6c0-1.9 1.1-3 3-3H14v2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.4-1.2A8.5 8.5 0 1 0 12 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.7 8.4c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4l.6 1.5c.1.2 0 .4-.1.5l-.4.5c-.1.1-.2.3 0 .5.3.5.8 1.1 1.3 1.5.5.4 1 .7 1.5.9.2.1.3 0 .4-.1l.5-.6c.1-.2.3-.2.5-.1l1.4.7c.2.1.3.3.3.5 0 .3-.1.9-.4 1.2-.3.4-.9.6-1.5.6-1 0-2.4-.4-4-1.9-1.8-1.6-2.7-3.2-2.9-3.7-.1-.3-.5-1.1-.3-1.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

const SOCIAL_ITEMS = [
  { key: "youtube" as const, label: "YouTube", Icon: IconYouTube },
  { key: "facebook" as const, label: "Facebook", Icon: IconFacebook },
  { key: "instagram" as const, label: "Instagram", Icon: IconInstagram },
  { key: "whatsapp" as const, label: "WhatsApp", Icon: IconWhatsApp },
];

export function SiteFooter() {
  const { user, logout } = useAuth();
  const goToSection = useGoToSection();
  const [motherChurch, setMotherChurch] = useState<Church | null>(null);

  useEffect(() => {
    fetchChurches()
      .then((list) => setMotherChurch(list.find((c) => c.is_mother) ?? null))
      .catch(() => {});
  }, []);

  const hasContactInfo =
    !!motherChurch && (motherChurch.address || motherChurch.phone || motherChurch.email);

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.cols}>
          {hasContactInfo && (
            <div className={styles.col}>
              <p className={styles.colTitle}>Nous joindre</p>
              <ul className={styles.contactList}>
                {motherChurch!.address && <li>{motherChurch!.address}</li>}
                {motherChurch!.phone && (
                  <li><a href={`tel:${motherChurch!.phone}`}>{motherChurch!.phone}</a></li>
                )}
                {motherChurch!.email && (
                  <li><a href={`mailto:${motherChurch!.email}`}>{motherChurch!.email}</a></li>
                )}
              </ul>
            </div>
          )}

          <div className={styles.col}>
            <p className={styles.colTitle}>Découvrir</p>
            <ul className={styles.links}>
              <li><button onClick={() => goToSection("qui-sommes-nous")}>Qui sommes-nous</button></li>
              <li><Link page="sermons">Sermons</Link></li>
              <li><Link page="blog">Blog</Link></li>
              <li><button onClick={() => goToSection("evenements")}>Événements</button></li>
            </ul>
          </div>

          <div className={styles.col}>
            <p className={styles.colTitle}>Participer</p>
            <ul className={styles.links}>
              <li><Link page="donation">Faire un don</Link></li>
            </ul>
          </div>

          <div className={styles.col}>
            <p className={styles.colTitle}>Compte</p>
            <ul className={styles.links}>
              {user ? (
                <>
                  <li><Link page="espace">Mon espace</Link></li>
                  <li><button onClick={logout}>Déconnexion</button></li>
                </>
              ) : (
                <>
                  <li><Link page="adhesion">Devenir membre</Link></li>
                  <li><Link page="login">Se connecter</Link></li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.social}>
        {SOCIAL_ITEMS.map(({ key, label, Icon }) => (
          <a
            key={key}
            className={styles.socialLink}
            href={SOCIAL_LINKS[key]}
            target="_blank"
            rel="noopener"
            aria-label={label}
            title={label}
          >
            <Icon />
          </a>
        ))}
      </div>

      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} Mission Évangélique — Tous droits réservés.</p>
        <Link page="confidentialite" className={styles.bottomLink}>
          Politique de confidentialité
        </Link>
      </div>
    </footer>
  );
}
