import { useState } from "react";
import styles from "./LoginPage.module.css";
import { login } from "../../lib/api/auth";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";

export function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

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
      const isAdmin =
        user.permissions.includes("*") ||
        user.permissions.includes("rbac:manage");
      navigate(isAdmin ? "admin" : "home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* Panneau de marque */}
      <div className={styles.brandPanel}>
        <div className={styles.brandTop}>
          <div className={styles.brandLogo}>+</div>
          <h1 className={styles.brandName}>Mission Évangélique</h1>
          <p className={styles.brandTagline}>unis dans la foi</p>
        </div>
        <blockquote className={styles.brandQuote}>
          « Allez, faites de toutes les nations des disciples. »
        </blockquote>
        <p className={styles.brandSecurity}>🔒 Connexion sécurisée SSL</p>
      </div>

      {/* Panneau formulaire */}
      <div className={styles.formPanel}>
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>Connexion</h2>
          <p className={styles.formSubtitle}>
            Accédez à votre espace membre ou d'administration.
          </p>

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
              <input
                id="password"
                type="password"
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
              <a href="#" className={styles.link}>
                Mot de passe oublié ?
              </a>
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
            <button
              className={styles.linkBtn}
              onClick={() => navigate("register")}
            >
              Créer un compte
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
