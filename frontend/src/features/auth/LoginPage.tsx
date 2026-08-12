import { useState } from "react";
import styles from "./LoginPage.module.css";
import { login } from "../../lib/api/auth";
import { fetchMyProfile } from "../../lib/api/members";
import { hasPermission, useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "../../context/RouterContext";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { useSiteContent } from "../../hooks/useSiteContent";
import { siteLogoUrl } from "../../lib/api/content";

export function LoginPage() {
  const { setUser, setMember } = useAuth();
  const navigate = useNavigate();
  const { settings } = useSiteContent();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      setUser(user);
      if (hasPermission(user, "rbac:manage")) {
        navigate("admin");
        return;
      }
      // Un compte doté d'une fiche membre arrive dans son espace. Sans fiche
      // — organisateur, compte de service — on reste sur l'accueil public.
      // Le profil est poussé dans le contexte au passage : l'en-tête affiche
      // ainsi le nom du membre sans attendre son propre chargement.
      const member = await fetchMyProfile().catch(() => null);
      setMember(member);
      navigate(member ? "espace" : "home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* En-tête minimal : uniquement le logo, cliquable pour revenir à l'accueil. */}
      <header className={styles.minimalHeader}>
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
      </header>

      <main className={styles.main}>
        <div className={styles.formCard}>
          <div className={styles.welcome}>
            <h1 className={styles.welcomeTitle}>Bienvenue</h1>
            <p className={styles.welcomeSub}>Connectez-vous à votre espace.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div>
              <label className={styles.label} htmlFor="email">
                Adresse courriel
              </label>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className={styles.label} htmlFor="password">
                Mot de passe
              </label>
              <PasswordInput
                id="password"
                className={styles.input}
                placeholder="········"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className={styles.errorMsg} role="alert">
                {error}
              </p>
            )}

            <div className={styles.forgotRow}>
              <button
                type="button"
                className={styles.link}
                onClick={() => navigate("mot-de-passe-oublie")}
              >
                Mot de passe oublié ?
              </button>
            </div>

            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={loading}
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <p className={styles.registerPrompt}>
            Pas encore membre ?{" "}
            <button className={styles.linkBtn} onClick={() => navigate("adhesion")}>
              Créer un compte
            </button>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
