import { useEffect, useState } from "react";
import adminStyles from "./AdminPage.module.css";
import styles from "./EglisesPanel.module.css";
import { useAuth } from "../../context/AuthContext";
import { useChurches } from "../../hooks/useChurches";
import { useParameters } from "../../hooks/useParameters";
import { validatePhone, validateEmailOptional, validateAddress } from "../../lib/validation";
import type { Church, ChurchInput, District } from "../../types";

const EMPTY: ChurchInput = {
    name: "", district: null, pastor_name: "", address: "", phone: "", email: "",
};

type FieldErrors = { phone?: string; email?: string; address?: string };

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
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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
        setFieldErrors({});
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function cancelEdit() {
        setEditingId(null);
        setForm(EMPTY);
        setFormError("");
        setFieldErrors({});
    }

    function clearFieldError(key: keyof FieldErrors) {
        setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name.trim()) return;

        const errs: FieldErrors = {
            phone:   validatePhone(form.phone ?? "") ?? undefined,
            email:   validateEmailOptional(form.email ?? "") ?? undefined,
            address: validateAddress(form.address ?? "") ?? undefined,
        };
        const hasErrors = Object.values(errs).some(Boolean);
        setFieldErrors(errs);
        if (hasErrors) return;

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

    if (loading) return <p className={adminStyles.stateMsg}>Chargement…</p>;

    return (
        <div className={adminStyles.rbacWrapper}>
            {error && <p className={adminStyles.errorMsg} role="alert">{error}</p>}

            {canManage && (
                <div className={styles.formCard}>
                    {/* En-tête coloré */}
                    <div className={styles.formHeader}>
                        <div className={styles.formHeaderIcon}>
                            {isEditing ? "✏️" : "🏛"}
                        </div>
                        <div>
                            <p className={styles.formHeaderTitle}>
                                {isEditing ? "Modifier l'église" : "Ajouter une église affiliée"}
                            </p>
                            <p className={styles.formHeaderSub}>
                                {isEditing
                                    ? "Modifiez les informations ci-dessous puis enregistrez."
                                    : "Remplissez les informations de la nouvelle église affiliée."}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.formBody}>
                        <div className={styles.grid2}>

                            {/* ── Identification ── */}
                            <div className={styles.sectionDivider}>
                                <p className={styles.sectionLabel}>Identification</p>
                            </div>

                            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>
                                    Nom officiel <span className={styles.required}>*</span>
                                </label>
                                <input
                                    className={styles.input}
                                    placeholder="ex. : Église Évangile Vivant"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>District</label>
                                <select
                                    className={styles.select}
                                    value={form.district ?? ""}
                                    onChange={(e) => setForm({ ...form, district: (e.target.value || null) as District | null })}
                                >
                                    <option value="">Sélectionner un district…</option>
                                    {districtValues.map((d) => (
                                        <option key={d.id} value={d.label}>{d.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>Pasteur / représentant</label>
                                <input
                                    className={styles.input}
                                    placeholder="ex. : Pasteur Jean Dupont"
                                    value={form.pastor_name ?? ""}
                                    onChange={(e) => setForm({ ...form, pastor_name: e.target.value })}
                                />
                            </div>

                            {/* ── Coordonnées ── */}
                            <div className={styles.sectionDivider}>
                                <p className={styles.sectionLabel}>Coordonnées</p>
                            </div>

                            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                                <label className={styles.label}>Adresse</label>
                                <input
                                    className={`${styles.input} ${fieldErrors.address ? styles.inputError : ""}`}
                                    placeholder="ex. : 123 Rue principale, Montréal, QC"
                                    value={form.address ?? ""}
                                    onChange={(e) => { setForm({ ...form, address: e.target.value }); clearFieldError("address"); }}
                                />
                                {fieldErrors.address && (
                                    <p className={styles.fieldError} role="alert">
                                        <span>⚠</span> {fieldErrors.address}
                                    </p>
                                )}
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>Téléphone</label>
                                <input
                                    className={`${styles.input} ${fieldErrors.phone ? styles.inputError : ""}`}
                                    placeholder="ex. : 514-123-4567"
                                    type="tel"
                                    value={form.phone ?? ""}
                                    onChange={(e) => { setForm({ ...form, phone: e.target.value }); clearFieldError("phone"); }}
                                />
                                {fieldErrors.phone && (
                                    <p className={styles.fieldError} role="alert">
                                        <span>⚠</span> {fieldErrors.phone}
                                    </p>
                                )}
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>Courriel</label>
                                <input
                                    className={`${styles.input} ${fieldErrors.email ? styles.inputError : ""}`}
                                    type="email"
                                    placeholder="ex. : eglise@exemple.com"
                                    value={form.email ?? ""}
                                    onChange={(e) => { setForm({ ...form, email: e.target.value }); clearFieldError("email"); }}
                                />
                                {fieldErrors.email && (
                                    <p className={styles.fieldError} role="alert">
                                        <span>⚠</span> {fieldErrors.email}
                                    </p>
                                )}
                            </div>
                        </div>

                        {formError && (
                            <div className={styles.errorBanner} role="alert">
                                <span className={styles.errorBannerIcon}>⚠</span>
                                <span>{formError}</span>
                            </div>
                        )}

                        <div className={styles.formActions}>
                            {isEditing && (
                                <button
                                    type="button"
                                    className={styles.btnGhost}
                                    onClick={cancelEdit}
                                    disabled={saving}
                                >
                                    Annuler
                                </button>
                            )}
                            <button type="submit" className={styles.btnPrimary} disabled={saving}>
                                {saving
                                    ? "Enregistrement…"
                                    : isEditing
                                    ? "✓ Enregistrer les modifications"
                                    : "+ Ajouter l'église"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Liste ── */}
            <section className={adminStyles.card}>
                <h3 className={adminStyles.cardTitle}>Églises ({filteredChurches.length})</h3>

                <div className={adminStyles.inlineForm} style={{ flexWrap: "wrap", marginBottom: "1rem", gap: "0.5rem" }}>
                    <input
                        className={adminStyles.input}
                        placeholder="Rechercher (nom, pasteur, adresse)…"
                        value={filterQ}
                        style={{ flex: "1 1 180px" }}
                        onChange={(e) => setFilterQ(e.target.value)}
                    />
                    <select className={adminStyles.select} value={filterDistrict}
                        onChange={(e) => setFilterDistrict(e.target.value)}>
                        <option value="">Tous les districts</option>
                        {districtValues.map((d) => <option key={d.id} value={d.label}>{d.label}</option>)}
                    </select>
                    <select className={adminStyles.select} value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}>
                        <option value="">Tous les types</option>
                        <option value="mere">Mère</option>
                        <option value="affiliee">Affiliée</option>
                    </select>
                </div>

                {filteredChurches.length === 0 ? (
                    <p className={adminStyles.empty}>Aucune église trouvée.</p>
                ) : (
                    <table className={adminStyles.table}>
                        <thead>
                            <tr>
                                <th className={adminStyles.th}>Nom</th>
                                <th className={adminStyles.th}>District</th>
                                <th className={adminStyles.th}>Type</th>
                                <th className={adminStyles.th}>Pasteur</th>
                                {canManage && <th className={adminStyles.th}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredChurches.map((c) => (
                                <tr key={c.id} className={editingId === c.id ? adminStyles.rowEditing : undefined}>
                                    <td className={adminStyles.td}><strong>{c.name}</strong></td>
                                    <td className={adminStyles.td}>{c.district ?? "—"}</td>
                                    <td className={adminStyles.td}>
                                        {c.is_mother
                                            ? <span className={`${adminStyles.badge} ${adminStyles.badgeMother}`}>Mère</span>
                                            : <span className={adminStyles.badge}>Affiliée</span>}
                                    </td>
                                    <td className={adminStyles.td}>{c.pastor_name ?? "—"}</td>
                                    {canManage && (
                                        <td className={adminStyles.td}>
                                            <div className={adminStyles.actions}>
                                                <button className={adminStyles.btnOutline} onClick={() => startEdit(c)}>
                                                    Modifier
                                                </button>
                                                {!c.is_mother && (
                                                    <button className={adminStyles.btnDanger} onClick={() => handleDelete(c.id, c.name)}>
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
