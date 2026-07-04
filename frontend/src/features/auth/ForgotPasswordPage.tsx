import { useState } from "react";
import styles from "./SetPasswordPage.module.css";
import { forgotPassword } from "../../lib/api/auth";
import { useNavigate } from "../../context/RouterContext";

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

    if (sent) {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <h1 className={styles.title}>Courriel envoyé</h1>
                    <p className={styles.sub}>
                        Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation dans les prochaines minutes.
                        Le lien est valable <strong>2 heures</strong>.
                    </p>
                    <button className={styles.submit} onClick={() => navigate("login")}>
                        Retour à la connexion
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <form className={styles.card} onSubmit={submit}>
                <h1 className={styles.title}>Mot de passe oublié</h1>
                <p className={styles.sub}>
                    Entrez votre adresse courriel pour recevoir un lien de réinitialisation.
                </p>
                <label className={styles.label}>Adresse courriel</label>
                <input
                    className={styles.input}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                />
                <button className={styles.submit} disabled={busy}>
                    {busy ? "Envoi…" : "Envoyer le lien"}
                </button>
                <button
                    type="button"
                    onClick={() => navigate("login")}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        marginTop: ".75rem", fontSize: ".85rem", color: "var(--text-muted)",
                        display: "block", width: "100%", textAlign: "center",
                    }}
                >
                    ← Retour à la connexion
                </button>
            </form>
        </div>
    );
}
