import { useState } from "react";
import styles from "./SetPasswordPage.module.css";
import { resetPassword, fetchMe } from "../../lib/api/auth";
import { setToken } from "../../lib/api/client";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";

export function ResetPasswordPage({ token }: { token: string }) {
    const { setUser } = useAuth();
    const navigate = useNavigate();
    const [pwd, setPwd] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (pwd.length < 8) return setError("8 caractères minimum.");
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
            setError(err instanceof Error ? err.message : "Lien invalide ou expiré.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className={styles.page}>
            <form className={styles.card} onSubmit={submit}>
                <h1 className={styles.title}>Nouveau mot de passe</h1>
                <p className={styles.sub}>Choisissez un nouveau mot de passe pour votre compte.</p>
                <label className={styles.label}>Nouveau mot de passe</label>
                <input
                    className={styles.input}
                    type="password"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    autoComplete="new-password"
                />
                <label className={styles.label}>Confirmer</label>
                <input
                    className={styles.input}
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                />
                {error && <p className={styles.error} role="alert">{error}</p>}
                <button className={styles.submit} disabled={busy}>
                    {busy ? "Enregistrement…" : "Enregistrer le mot de passe"}
                </button>
            </form>
        </div>
    );
}
