import { useEffect, useState } from "react";
import styles from "../auth/SetPasswordPage.module.css";
import { fetchMyProfile, updateMyProfile } from "../../lib/api/members";
import { useNavigate } from "../../context/RouterContext";
import type { Member } from "../../types";

export function MyProfilePage() {
    const navigate = useNavigate();
    const [m, setM] = useState<Member | null>(null);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyProfile()
            .then(setM)
            .catch(() => setError("Aucune fiche membre n'est liée à votre compte."))
            .finally(() => setLoading(false));
    }, []);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (!m) return;
        setSaved(false);
        setError("");
        try {
            const updated = await updateMyProfile({
                first_name: m.first_name, last_name: m.last_name,
                address: m.address, birth_date: m.birth_date, family_status: m.family_status,
            });
            setM(updated);
            setSaved(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur d'enregistrement.");
        }
    }

    if (loading) return <div className={styles.page}><p>Chargement…</p></div>;

    return (
        <div className={styles.page}>
            <form className={styles.card} onSubmit={save} style={{ maxWidth: 460 }}>
                <h1 className={styles.title}>Mon profil</h1>
                {error && <p className={styles.error} role="alert">{error}</p>}
                {m && (
                    <>
                        <label className={styles.label}>Prénom</label>
                        <input className={styles.input} value={m.first_name}
                               onChange={(e) => setM({ ...m, first_name: e.target.value })} />
                        <label className={styles.label}>Nom</label>
                        <input className={styles.input} value={m.last_name}
                               onChange={(e) => setM({ ...m, last_name: e.target.value })} />
                        <label className={styles.label}>Adresse</label>
                        <input className={styles.input} value={m.address ?? ""}
                               onChange={(e) => setM({ ...m, address: e.target.value })} />
                        <label className={styles.label}>Date de naissance</label>
                        <input className={styles.input} type="date" value={m.birth_date ?? ""}
                               onChange={(e) => setM({ ...m, birth_date: e.target.value })} />
                        <p className={styles.sub} style={{ marginTop: ".75rem" }}>
                            Courriel : {m.email} · Statut : {m.status}
                        </p>
                        {saved && <p style={{ color: "#166534", fontSize: ".85rem" }}>Enregistré ✓</p>}
                        <button className={styles.submit}>Enregistrer</button>
                        <button type="button" className={styles.label}
                                style={{ background: "none", border: "none", marginTop: ".75rem", cursor: "pointer", color: "var(--text-muted)" }}
                                onClick={() => navigate("home")}>← Accueil</button>
                    </>
                )}
            </form>
        </div>
    );
}