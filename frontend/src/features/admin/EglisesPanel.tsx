import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useChurches } from "../../hooks/useChurches";
import { useParameters } from "../../hooks/useParameters";
import type { Church, ChurchInput, District } from "../../types";
const EMPTY: ChurchInput = {
    name: "", district: null, pastor_name: "", address: "", phone: "", email: "",
};

function churchToForm(c: Church): ChurchInput {
    return {
        name: c.name,
        district: c.district,
        pastor_name: c.pastor_name ?? "",
        address: c.address ?? "",
        phone: c.phone ?? "",
        email: c.email ?? "",
    };
}

export function EglisesPanel() {
    const { user } = useAuth();
    const { churches, loading, error, load, add, edit, remove } = useChurches();
    const { values: districtValues, load: loadDistricts } = useParameters("district");
    const [form, setForm] = useState<ChurchInput>(EMPTY);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const canManage =
        user?.permissions.includes("*") || user?.permissions.includes("church:manage");
    const isEditing = editingId !== null;

    const [filterQ, setFilterQ] = useState("");
    const [filterDistrict, setFilterDistrict] = useState("");
    const [filterType, setFilterType] = useState("");

    useEffect(() => {
        load();
        loadDistricts();
    }, [load, loadDistricts]);

    const filteredChurches = churches.filter((c) => {
        if (filterQ) {
            const term = filterQ.toLowerCase();
            if (!c.name.toLowerCase().includes(term) &&
                !(c.pastor_name ?? "").toLowerCase().includes(term) &&
                !(c.address ?? "").toLowerCase().includes(term)) return false;
        }
        if (filterDistrict && c.district !== filterDistrict) return false;
        if (filterType === "mere" && !c.is_mother) return false;
        if (filterType === "affiliee" && c.is_mother) return false;
        return true;
    });

    function startEdit(c: Church) {
        setEditingId(c.id);
        setForm(churchToForm(c));
        setFormError("");
    }

    function cancelEdit() {
        setEditingId(null);
        setForm(EMPTY);
        setFormError("");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSaving(true);
        setFormError("");
        try {
            const payload = { ...form, name: form.name.trim() };
            if (editingId !== null) {
                await edit(editingId, payload);
            } else {
                await add(payload);
            }
            cancelEdit();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Erreur");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: number, name: string) {
        if (!confirm(`Supprimer l'église « ${name} » ?`)) return;
        try {
            await remove(id);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Suppression impossible");
        }
    }

    if (loading) return <p className={styles.stateMsg}>Chargement…</p>;

    return (
        <div className={styles.rbacWrapper}>
            {error && <p className={styles.errorMsg} role="alert">{error}</p>}

            {canManage && (
                <section className={styles.card}>
                    <h3 className={styles.cardTitle}>
                        {isEditing ? "Modifier l'église" : "Ajouter une église affiliée"}
                    </h3>
                    <form onSubmit={handleSubmit} className={styles.formGrid}>
                        <input className={styles.input} placeholder="Nom officiel *" required
                               value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <select className={styles.select} value={form.district ?? ""}
                                onChange={(e) => setForm({ ...form, district: (e.target.value || null) as District | null })}>
                            <option value="">District…</option>
                            {districtValues.map((d) => <option key={d.id} value={d.label}>{d.label}</option>)}
                        </select>
                        <input className={styles.input} placeholder="Pasteur / représentant"
                               value={form.pastor_name ?? ""} onChange={(e) => setForm({ ...form, pastor_name: e.target.value })} />
                        <input className={styles.input} placeholder="Adresse"
                               value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                        <input className={styles.input} placeholder="Téléphone"
                               value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        <input className={styles.input} type="email" placeholder="Courriel"
                               value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        <button type="submit" className={styles.btnPrimary} disabled={saving}>
                            {saving ? "Enregistrement…" : isEditing ? "Enregistrer" : "+ Ajouter"}
                        </button>
                        {isEditing && (
                            <button type="button" className={styles.btnGhost} onClick={cancelEdit} disabled={saving}>
                                Annuler
                            </button>
                        )}
                    </form>
                    {formError && (
                        <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>
                            {formError}
                        </p>
                    )}
                </section>
            )}

            <section className={styles.card}>
                <h3 className={styles.cardTitle}>Églises ({filteredChurches.length})</h3>

                <div className={styles.inlineForm} style={{ flexWrap: "wrap", marginBottom: "1rem", gap: "0.5rem" }}>
                    <input
                        className={styles.input}
                        placeholder="Rechercher (nom, pasteur, adresse)…"
                        value={filterQ}
                        style={{ flex: "1 1 180px" }}
                        onChange={(e) => setFilterQ(e.target.value)}
                    />
                    <select className={styles.select} value={filterDistrict}
                        onChange={(e) => setFilterDistrict(e.target.value)}>
                        <option value="">Tous les districts</option>
                        {districtValues.map((d) => <option key={d.id} value={d.label}>{d.label}</option>)}
                    </select>
                    <select className={styles.select} value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}>
                        <option value="">Tous les types</option>
                        <option value="mere">Mère</option>
                        <option value="affiliee">Affiliée</option>
                    </select>
                </div>

                {filteredChurches.length === 0 ? (
                    <p className={styles.empty}>Aucune église trouvée.</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                        <tr>
                            <th className={styles.th}>Nom</th>
                            <th className={styles.th}>District</th>
                            <th className={styles.th}>Type</th>
                            <th className={styles.th}>Pasteur</th>
                            {canManage && <th className={styles.th}></th>}
                        </tr>
                        </thead>
                        <tbody>
                        {filteredChurches.map((c) => (
                            <tr key={c.id} className={editingId === c.id ? styles.rowEditing : undefined}>
                                <td className={styles.td}><strong>{c.name}</strong></td>
                                <td className={styles.td}>{c.district ?? "—"}</td>
                                <td className={styles.td}>
                                    {c.is_mother
                                        ? <span className={`${styles.badge} ${styles.badgeMother}`}>Mère</span>
                                        : <span className={styles.badge}>Affiliée</span>}
                                </td>
                                <td className={styles.td}>{c.pastor_name ?? "—"}</td>
                                {canManage && (
                                    <td className={styles.td}>
                                        <div className={styles.actions}>
                                            <button className={styles.btnOutline} onClick={() => startEdit(c)}>
                                                Modifier
                                            </button>
                                            {!c.is_mother && (
                                                <button className={styles.btnDanger} onClick={() => handleDelete(c.id, c.name)}>
                                                    Supprimer
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
}