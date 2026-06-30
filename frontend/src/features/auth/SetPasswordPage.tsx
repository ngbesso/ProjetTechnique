import { useState } from "react";
import styles from "./SetPasswordPage.module.css";
import { setPassword, fetchMe } from "../../lib/api/auth";
import { setToken } from "../../lib/api/client";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";

export function SetPasswordPage({ token }: { token: string }) {
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
            const { access_token } = await setPassword(token, pwd);
            setToken(access_token);
            setUser(await fetchMe());
            window.history.replaceState({}, "", "/");
            navigate("mon-profil");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Lien invalide ou expiré.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className={styles.page}>
            <form className={styles.card} onSubmit={submit}>
                <h1 className={styles.title}>Activer mon compte</h1>
                <p className={styles.sub}>Choisissez un mot de passe pour accéder à votre espace.</p>
                <label className={styles.label}>Mot de passe</label>
                <input className={styles.input} type="password" value={pwd}
                       onChange={(e) => setPwd(e.target.value)} />
                <label className={styles.label}>Confirmer</label>
                <input className={styles.input} type="password" value={confirm}
                       onChange={(e) => setConfirm(e.target.value)} />
                {error && <p className={styles.error} role="alert">{error}</p>}
                <button className={styles.submit} disabled={busy}>
                    {busy ? "Activation…" : "Activer mon compte"}
                </button>
            </form>
        </div>
    );
}