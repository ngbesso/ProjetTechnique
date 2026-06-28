import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useMembers } from "../../hooks/useMembers";
import type { MemberStatus } from "../../types";

const STATUS_META: Record<MemberStatus, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "badgePending" },
    active: { label: "Actif", cls: "badgeActive" },
    inactive: { label: "Inactif", cls: "badgeInactive" },
    rejected: { label: "Refusé", cls: "badgeRejected" },
};

export function MembresPanel() {
    const { user } = useAuth();
    const { members, total, loading, error, load, approve, reject, deactivate } = useMembers();
    const [q, setQ] = useState("");
    const [status, setStatus] = useState<MemberStatus | "">("");

    const canApprove =
        user?.permissions.includes("*") || user?.permissions.includes("member:approve");

    useEffect(() => {
        load();
    }, [load]);

    function applyFilters(e: React.FormEvent) {
        e.preventDefault();
        load({ q: q.trim() || undefined, status: status || undefined });
    }

    return (
        <div className={styles.rbacWrapper}>
            <section className={styles.card}>
                <h3 className={styles.cardTitle}>Membres ({total})</h3>

                <form onSubmit={applyFilters} className={styles.toolbar}>
                    <input className={styles.input} placeholder="Rechercher (nom, courriel)…"
                           value={q} onChange={(e) => setQ(e.target.value)} />
                    <select className={styles.select} value={status}
                            onChange={(e) => setStatus(e.target.value as MemberStatus | "")}>
                        <option value="">Tous les statuts</option>
                        <option value="pending">En attente</option>
                        <option value="active">Actif</option>
                        <option value="inactive">Inactif</option>
                        <option value="rejected">Refusé</option>
                    </select>
                    <button type="submit" className={styles.btnPrimary}>Filtrer</button>
                </form>

                {error && <p className={styles.errorMsg} role="alert">{error}</p>}
                {loading ? (
                    <p className={styles.stateMsg}>Chargement…</p>
                ) : members.length === 0 ? (
                    <p className={styles.empty}>Aucun membre dans votre périmètre.</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                        <tr>
                            <th className={styles.th}>Nom</th>
                            <th className={styles.th}>Courriel</th>
                            <th className={styles.th}>Statut</th>
                            <th className={styles.th}>Baptisé</th>
                            {canApprove && <th className={styles.th}>Actions</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {members.map((m) => {
                            const meta = STATUS_META[m.status];
                            return (
                                <tr key={m.id}>
                                    <td className={styles.td}><strong>{m.first_name} {m.last_name}</strong></td>
                                    <td className={styles.td}>{m.email}</td>
                                    <td className={styles.td}>
                                        <span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span>
                                    </td>
                                    <td className={styles.td}>{m.is_baptized ? "Oui" : "Non"}</td>
                                    {canApprove && (
                                        <td className={styles.td}>
                                            <div className={styles.actions}>
                                                {m.status === "pending" && (
                                                    <>
                                                        <button className={styles.btnPrimarySm} onClick={() => approve(m.id)}>Approuver</button>
                                                        <button className={styles.btnDanger} onClick={() => reject(m.id)}>Refuser</button>
                                                    </>
                                                )}
                                                {m.status === "active" && (
                                                    <button className={styles.btnOutline} onClick={() => deactivate(m.id)}>Désactiver</button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
}