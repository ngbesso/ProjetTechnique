import { useEffect, useState } from "react";
import adminStyles from "./AdminPage.module.css";
import styles from "./EglisesPanel.module.css";
import { useAuth } from "../../context/AuthContext";
import { useChurches } from "../../hooks/useChurches";
import { useParameters } from "../../hooks/useParameters";
import { useConfirm } from "../../hooks/useConfirm";
import { validatePhone, validateEmailOptional, validateAddress } from "../../lib/validation";
import { KpiCard } from "../../components/ui/KpiCard";
import type { Church, ChurchInput, District } from "../../types";

const EMPTY: ChurchInput = {
    name: "", district: null, pastor_name: "", address: "", phone: "", email: "",
};

// ── Icônes KPI ──────────────────────────────────────────────────────────────

function IconCheckCircle() {
    return (
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="8 12 11 15 16 9" />
        </svg>
    );
}

function IconXCircle() {
    return (
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    );
}

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
    const { confirm, dialog } = useConfirm();
    const [form, setForm] = useState<ChurchInput>(EMPTY);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
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

    const activeCount = churches.filter((c) => c.is_active).length;
    const inactiveCount = churches.filter((c) => !c.is_active).length;

    function openCreate() {
        setEditingId(null);
        setForm(EMPTY);
        setFormError("");
        setFieldErrors({});
        setShowModal(true);
    }

    function startEdit(c: Church) {
        setEditingId(c.id);
        setForm(churchToForm(c));
        setFormError("");
        setFieldErrors({});
        setShowModal(true);
    }

    function cancelEdit() {
        setEditingId(null);
        setForm(EMPTY);
        setFormError("");
        setFieldErrors({});
        setShowModal(false);
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
        const ok = await confirm({
            title: `Supprimer l'église « ${name} » ?`,
            description: "Cette action est irréversible.",
            confirmLabel: "Supprimer",
            variant: "danger",
        });
        if (!ok) return;
        try {
            await remove(id);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Suppression impossible");
        }
    }

    async function handleToggleActive(c: Church) {
        const action = c.is_active ? "Désactiver" : "Réactiver";
        const ok = await confirm({
            title: `${action} l'église « ${c.name} » ?`,
            variant: c.is_active ? "danger" : "default",
            confirmLabel: action,
        });
        if (!ok) return;
        try {
            await edit(c.id, { is_active: !c.is_active });
            if (c.is_active && editingId === c.id) cancelEdit();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Opération impossible");
        }
    }

    if (loading) return <p className={adminStyles.stateMsg}>Chargement…</p>;

    return (
        <div className={adminStyles.rbacWrapper}>
            {error && <p className={adminStyles.errorMsg} role="alert">{error}</p>}

            <div className={adminStyles.kpiGrid}>
                <KpiCard color="emerald" icon={<IconCheckCircle />} value={activeCount} label="Actives" />
                <KpiCard color="rose" icon={<IconXCircle />} value={inactiveCount} label="Inactives" />
            </div>

            {canManage && showModal && (
            <div className={styles.modalOverlay} onClick={cancelEdit}>
                <div className={styles.formCard} onClick={(e) => e.stopPropagation()}>
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
                        <button type="button" className={styles.formHeaderClose} onClick={cancelEdit} aria-label="Fermer">
                            ✕
                        </button>
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
                            <button
                                type="button"
                                className={styles.btnGhost}
                                onClick={cancelEdit}
                                disabled={saving}
                            >
                                Annuler
                            </button>
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
            </div>
            )}

            {/* ── Liste ── */}
            <div className={styles.listCard}>
                <div className={styles.listHeader}>
                    {canManage && (
                        <button type="button" className={styles.btnPrimary} onClick={openCreate}>
                            + Ajouter une église
                        </button>
                    )}
                    <p className={styles.listTitle}>
                        Églises
                        <span className={styles.listCount}>{filteredChurches.length}</span>
                    </p>
                </div>

                <div className={styles.filterRow}>
                    <input
                        className={styles.filterInput}
                        placeholder="Rechercher (nom, pasteur, adresse)…"
                        value={filterQ}
                        onChange={(e) => setFilterQ(e.target.value)}
                    />
                    <select className={styles.filterSelect} value={filterDistrict}
                        onChange={(e) => setFilterDistrict(e.target.value)}>
                        <option value="">Tous les districts</option>
                        {districtValues.map((d) => <option key={d.id} value={d.label}>{d.label}</option>)}
                    </select>
                    <select className={styles.filterSelect} value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}>
                        <option value="">Tous les types</option>
                        <option value="mere">Mère</option>
                        <option value="affiliee">Affiliée</option>
                    </select>
                </div>

                {filteredChurches.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyIcon}>🏛</p>
                        <p className={styles.emptyText}>Aucune église trouvée.</p>
                    </div>
                ) : (
                    <div className={styles.churchGrid}>
                        {filteredChurches.map((c) => (
                            <div
                                key={c.id}
                                className={`${styles.churchCard} ${editingId === c.id ? styles.churchCardEditing : ""} ${!c.is_active ? styles.churchCardInactive : ""}`}
                            >
                                <div className={`${styles.churchCardBand} ${c.is_mother ? styles.churchCardBandMother : ""}`} />
                                <div className={styles.churchCardBody}>
                                    <div className={styles.churchCardTop}>
                                        <p className={styles.churchCardName}>{c.name}</p>
                                        {c.is_mother
                                            ? <span className={styles.badgeMother}>Mère</span>
                                            : <span className={styles.badgeAffiliated}>Affiliée</span>}
                                        {!c.is_active && (
                                            <span className={styles.badgeInactive}>Désactivée</span>
                                        )}
                                    </div>
                                    <div className={styles.churchMeta}>
                                        {c.district && (
                                            <div className={styles.churchMetaRow}>
                                                <span className={styles.metaIcon}>📍</span>
                                                <span className={styles.metaText}>{c.district}</span>
                                            </div>
                                        )}
                                        {c.pastor_name && (
                                            <div className={styles.churchMetaRow}>
                                                <span className={styles.metaIcon}>👤</span>
                                                <span className={styles.metaText}>{c.pastor_name}</span>
                                            </div>
                                        )}
                                        {c.address && (
                                            <div className={styles.churchMetaRow}>
                                                <span className={styles.metaIcon}>🏠</span>
                                                <span className={styles.metaText}>{c.address}</span>
                                            </div>
                                        )}
                                        {c.phone && (
                                            <div className={styles.churchMetaRow}>
                                                <span className={styles.metaIcon}>📞</span>
                                                <span className={styles.metaText}>{c.phone}</span>
                                            </div>
                                        )}
                                        {c.email && (
                                            <div className={styles.churchMetaRow}>
                                                <span className={styles.metaIcon}>✉️</span>
                                                <span className={styles.metaText}>{c.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {canManage && (
                                    <div className={styles.churchCardFooter}>
                                        {c.is_active && (
                                            <button className={styles.btnCardEdit} onClick={() => startEdit(c)}>
                                                ✏ Modifier
                                            </button>
                                        )}
                                        {!c.is_mother && (
                                            <>
                                                <button
                                                    className={c.is_active ? styles.btnCardDeactivate : styles.btnCardActivate}
                                                    onClick={() => handleToggleActive(c)}
                                                >
                                                    {c.is_active ? "⏸ Désactiver" : "▶ Réactiver"}
                                                </button>
                                                <button className={styles.btnCardDelete} onClick={() => handleDelete(c.id, c.name)}>
                                                    🗑 Supprimer
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {dialog}
        </div>
    );
}
