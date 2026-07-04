import { useState } from "react";
import styles from "./AuthPage.module.css";
import { setPassword, fetchMe } from "../../lib/api/auth";
import { setToken } from "../../lib/api/client";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";

function IconKey() {
    return (
        <svg viewBox="0 0 24 24">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
        </svg>
    );
}

export function SetPasswordPage({ token }: { token: string }) {
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
            const { access_token } = await setPassword(token, pwd);
            setToken(access_token);
            setUser(await fetchMe());
            window.history.replaceState({}, "", "/");
            navigate("mon-profil");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ce lien est invalide ou a déjà été utilisé.");
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
                            <IconKey />
                        </div>

                        <h1 className={styles.title}>Activez votre compte</h1>
                        <p className={styles.sub}>
                            Bienvenue ! Choisissez un mot de passe pour accéder à votre espace membre.
                            Ce lien est valable <strong>48 heures</strong> et ne peut être utilisé qu'une seule fois.
                        </p>

                        <form onSubmit={submit} noValidate>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="pwd">Mot de passe</label>
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
                                {busy ? "Activation en cours…" : "Activer mon compte"}
                            </button>
                        </form>

                        <div className={styles.divider} />
                        <button className={styles.btnGhost} onClick={() => navigate("login")}>
                            Déjà un compte ? Se connecter
                        </button>
                    </div>
                </div>
            </main>

            <SiteFooter />
        </div>
    );
}
