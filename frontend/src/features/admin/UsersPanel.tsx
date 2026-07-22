import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useUsers } from "../../hooks/useUsers";
import { useRbac } from "../../hooks/useRbac";
import { useChurches } from "../../hooks/useChurches";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import type { UserAdmin } from "../../types";

const col = createColumnHelper<UserAdmin>();

export function UsersPanel() {
    const { users, loading, error, load, toggleActive, assign, revoke, create } = useUsers();
    const { roles, load: loadRbac } = useRbac();
    const { churches, load: loadChurches } = useChurches();
    const [uId, setUId] = useState("");
    const [rId, setRId] = useState("");
    const [cId, setCId] = useState("");
    const [assignError, setAssignError] = useState("");
    const [filterQ, setFilterQ] = useState("");
    const [filterActive, setFilterActive] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState("");

    useEffect(() => { load(); loadRbac(); loadChurches(); }, [load, loadRbac, loadChurches]);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        const email = newEmail.trim();
        if (!email) return;
        setCreating(true);
        setCreateError("");
        setCreateSuccess("");
        try {
            await create(email);
            setNewEmail("");
            setCreateSuccess(`Compte créé pour ${email} — un lien d'activation lui a été envoyé par courriel.`);
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : "Erreur");
        } finally {
            setCreating(false);
        }
    }

    const filteredUsers = users.filter((u) => {
        if (filterQ && !u.email.toLowerCase().includes(filterQ.toLowerCase())) return false;
        if (filterActive === "active" && !u.is_active) return false;
        if (filterActive === "inactive" && u.is_active) return false;
        return true;
    });

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

    const columns = [
        col.accessor("email", { header: "Courriel" }),
        col.display({
            id: "roles",
            header: "Rôles (portée)",
            cell: (info) => {
                const u = info.row.original;
                return (
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
                );
            },
        }),
        col.accessor("is_active", {
            header: "Statut",
            cell: (info) => (
                <span className={`${styles.badge} ${info.getValue() ? styles.badgeActive : styles.badgeInactive}`}>
                    {info.getValue() ? "Actif" : "Désactivé"}
                </span>
            ),
        }),
        col.display({
            id: "actions_toggle",
            header: "Actions",
            cell: (info) => {
                const u = info.row.original;
                return (
                    <button className={styles.btnOutline} onClick={() => toggleActive(u.id, !u.is_active)}>
                        {u.is_active ? "Désactiver" : "Réactiver"}
                    </button>
                );
            },
        }),
    ];

    return (
        <>
            <section className={styles.card}>
                <h3 className={styles.cardTitle}>Créer un compte</h3>
                <p style={{ fontSize: ".875rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
                    Crée un compte autonome (sans fiche membre associée) — utile par exemple pour un
                    organisateur qui n'a besoin que d'un accès à l'administration. Un lien d'activation
                    lui est envoyé par courriel.
                </p>
                <form onSubmit={handleCreate} className={styles.inlineForm}>
                    <input
                        className={styles.input}
                        type="email"
                        placeholder="courriel@exemple.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                    />
                    <button type="submit" className={styles.btnPrimary} disabled={creating || !newEmail.trim()}>
                        {creating ? "…" : "+ Créer le compte"}
                    </button>
                </form>
                {createSuccess && (
                    <p style={{ color: "var(--vivid-violet)", fontSize: ".875rem", marginTop: ".5rem" }}>
                        ✓ {createSuccess}
                    </p>
                )}
                {createError && <p className={styles.errorMsg} role="alert" style={{ marginTop: ".5rem" }}>{createError}</p>}
            </section>

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
                <h3 className={styles.cardTitle}>Utilisateurs ({filteredUsers.length})</h3>

                <div className={styles.inlineForm} style={{ flexWrap: "wrap", marginBottom: "1rem", gap: "0.5rem" }}>
                    <input
                        className={styles.input}
                        placeholder="Rechercher par courriel…"
                        value={filterQ}
                        style={{ flex: "1 1 200px" }}
                        onChange={(e) => setFilterQ(e.target.value)}
                    />
                    <select className={styles.select} value={filterActive}
                        onChange={(e) => setFilterActive(e.target.value)}>
                        <option value="">Tous les statuts</option>
                        <option value="active">Actif</option>
                        <option value="inactive">Désactivé</option>
                    </select>
                </div>

                {loading ? <p className={styles.stateMsg}>Chargement…</p>
                    : error ? <p className={styles.errorMsg} role="alert">{error}</p>
                        : (
                            <DataTable
                                columns={columns}
                                data={filteredUsers}
                                getRowId={(u) => u.id}
                                emptyMessage="Aucun utilisateur."
                            />
                        )}
            </section>
        </>
    );
}