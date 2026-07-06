import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useUsers } from "../../hooks/useUsers";
import { useRbac } from "../../hooks/useRbac";
import { useChurches } from "../../hooks/useChurches";

export function UsersPanel() {
    const { users, loading, error, load, toggleActive, assign, revoke } = useUsers();
    const { roles, load: loadRbac } = useRbac();
    const { churches, load: loadChurches } = useChurches();
    const [uId, setUId] = useState("");
    const [rId, setRId] = useState("");
    const [cId, setCId] = useState("");
    const [assignError, setAssignError] = useState("");

    useEffect(() => { load(); loadRbac(); loadChurches(); }, [load, loadRbac, loadChurches]);

    async function handleAssign(e: React.FormEvent) {
        e.preventDefault();
        if (!uId || !rId || !cId) return;
        setAssignError("");
        try {
            await assign({ user_id: +uId, role_id: +rId, church_id: +cId });
            setUId(""); setRId(""); setCId("");
        } catch (err) {
            setAssignError(err instanceof Error ? err.message : "Erreur");
        }
    }

    return (
        <>
            <section className={styles.card}>
                <h3 className={styles.cardTitle}>Attribuer un rôle</h3>
                <form onSubmit={handleAssign} className={styles.formGrid}>
                    <select className={styles.select} value={uId} onChange={(e) => setUId(e.target.value)} required>
                        <option value="">Utilisateur…</option>
                        {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
                    </select>
                    <select className={styles.select} value={rId} onChange={(e) => setRId(e.target.value)} required>
                        <option value="">Rôle…</option>
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <select className={styles.select} value={cId} onChange={(e) => setCId(e.target.value)} required>
                        <option value="">Église…</option>
                        {churches.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_mother ? " (mère)" : ""}</option>)}
                    </select>
                    <button type="submit" className={styles.btnPrimary}>Attribuer</button>
                </form>
                <p className={styles.helpText}>
                    Un rôle porté sur l'église mère couvre toutes les affiliées (cascade) ; sur une affiliée, il y enferme la personne.
                </p>
                {assignError && <p className={styles.errorMsg} role="alert" style={{ marginTop: ".5rem" }}>{assignError}</p>}
            </section>

            <section className={styles.card}>
                <h3 className={styles.cardTitle}>Utilisateurs ({users.length})</h3>
                {loading ? <p className={styles.stateMsg}>Chargement…</p>
                    : error ? <p className={styles.errorMsg} role="alert">{error}</p>
                        : (
                            <table className={styles.table}>
                                <thead>
                                <tr>
                                    <th className={styles.th}>Courriel</th>
                                    <th className={styles.th}>Rôles (portée)</th>
                                    <th className={styles.th}>Statut</th>
                                    <th className={styles.th}>Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td className={styles.td}>{u.email}</td>
                                        <td className={styles.td}>
                                            <div className={styles.actions}>
                                                {u.assignments.length === 0 && <span className={styles.empty}>—</span>}
                                                {u.assignments.map((a) => (
                                                    <span key={`${a.role_id}-${a.church_id}`} className={styles.badge}>
                            {a.role} @ {a.church_name}
                                                        <button className={styles.chipX} title="Retirer"
                                                                onClick={() => revoke({ user_id: u.id, role_id: a.role_id, church_id: a.church_id })}>×</button>
                          </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className={styles.td}>
                      <span className={`${styles.badge} ${u.is_active ? styles.badgeActive : styles.badgeInactive}`}>
                        {u.is_active ? "Actif" : "Désactivé"}
                      </span>
                                        </td>
                                        <td className={styles.td}>
                                            <button className={styles.btnOutline} onClick={() => toggleActive(u.id, !u.is_active)}>
                                                {u.is_active ? "Désactiver" : "Réactiver"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
            </section>
        </>
    );
}