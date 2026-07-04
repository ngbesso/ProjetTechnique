import { useState } from "react";
import styles from "./AuthPage.module.css";
import { forgotPassword } from "../../lib/api/auth";
import { useNavigate } from "../../context/RouterContext";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";

function IconEnvelope() {
    return (
        <svg viewBox="0 0 24 24">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
        </svg>
    );
}

function IconCheck() {
    return (
        <svg viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

export function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        try {
            await forgotPassword(email);
        } finally {
            setBusy(false);
            setSent(true);
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
                            <IconEnvelope />
                        </div>

                        <h1 className={styles.title}>Mot de passe oublié ?</h1>
                        <p className={styles.sub}>
                            Entrez votre adresse courriel et nous vous enverrons un lien
                            pour réinitialiser votre mot de passe.
                        </p>

                        {sent ? (
                            <>
                                <div className={styles.sentBox}>
                                    <div className={styles.sentIcon}>
                                        <IconCheck />
                                    </div>
                                    <p className={styles.sentTitle}>Courriel envoyé</p>
                                    <p className={styles.sentText}>
                                        Si un compte existe avec l'adresse <strong>{email}</strong>,
                                        vous recevrez un lien valable <strong>2 heures</strong>.
                                        Vérifiez aussi vos indésirables.
                                    </p>
                                </div>
                                <button className={styles.btn} onClick={() => navigate("login")}>
                                    Retour à la connexion
                                </button>
                                <button className={styles.btnGhost} onClick={() => setSent(false)}>
                                    Renvoyer un lien
                                </button>
                            </>
                        ) : (
                            <form onSubmit={submit} noValidate>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label} htmlFor="email">Adresse courriel</label>
                                    <input
                                        id="email"
                                        className={styles.input}
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        placeholder="vous@exemple.com"
                                    />
                                </div>

                                <button className={styles.btn} disabled={busy}>
                                    {busy ? "Envoi en cours…" : "Envoyer le lien"}
                                </button>

                                <div className={styles.divider} />
                                <button
                                    type="button"
                                    className={styles.btnGhost}
                                    onClick={() => navigate("login")}
                                >
                                    ← Retour à la connexion
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>

            <SiteFooter />
        </div>
    );
}
