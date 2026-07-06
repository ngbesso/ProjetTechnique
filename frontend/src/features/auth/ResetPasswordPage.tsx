import { useState } from "react";
import styles from "./AuthPage.module.css";
import { resetPassword, fetchMe } from "../../lib/api/auth";
import { setToken } from "../../lib/api/client";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";

function IconLock() {
    return (
        <svg viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

export function ResetPasswordPage({ token }: { token: string }) {
    const { setUser } = useAuth();
    const navigate = useNavigate();
    const [pwd, setPwd] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (pwd.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
        if (pwd !== confirm) return setError("Les mots de passe ne correspondent pas.");
        setBusy(true);
        setError("");
        try {
            const { access_token } = await resetPassword(token, pwd);
            setToken(access_token);
            setUser(await fetchMe());
            window.history.replaceState({}, "", "/");
            navigate("home");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ce lien est invalide ou a expiré.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className={styles.page}>
            <SiteHeader />

            <main className={styles.main}>
                <div className={styles.card}>
                    <div className={styles.cardTop} />
                    <div className={styles.cardBody}>

                        <div className={styles.iconWrap}>
                            <IconLock />
                        </div>

                        <h1 className={styles.title}>Nouveau mot de passe</h1>
                        <p className={styles.sub}>
                            Choisissez un nouveau mot de passe sécurisé pour votre compte.
                            Ce lien est valable <strong>2 heures</strong> et ne peut être utilisé qu'une seule fois.
                        </p>

                        <form onSubmit={submit} noValidate>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="pwd">Nouveau mot de passe</label>
                                <input
                                    id="pwd"
                                    className={styles.input}
                                    type="password"
                                    value={pwd}
                                    onChange={(e) => setPwd(e.target.value)}
                                    autoComplete="new-password"
                                    placeholder="8 caractères minimum"
                                    required
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="confirm">Confirmer le mot de passe</label>
                                <input
                                    id="confirm"
                                    className={styles.input}
                                    type="password"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    autoComplete="new-password"
                                    placeholder="Répétez votre mot de passe"
                                    required
                                />
                            </div>

                            {error && <p className={styles.error} role="alert">{error}</p>}

                            <button className={styles.btn} disabled={busy}>
                                {busy ? "Enregistrement…" : "Enregistrer le mot de passe"}
                            </button>
                        </form>

                        <div className={styles.divider} />
                        <button className={styles.btnGhost} onClick={() => navigate("login")}>
                            ← Retour à la connexion
                        </button>
                    </div>
                </div>
            </main>

            <SiteFooter />
        </div>
    );
}
