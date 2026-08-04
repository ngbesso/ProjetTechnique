import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useParameters } from "../../hooks/useParameters";
import { TODAY, YESTERDAY } from "../../lib/format";
import { validatePhone, validateAddress } from "../../lib/validation";
import type { Member, MemberUpdateInput } from "../../types";

type FieldErrors = { telephone?: string; address?: string };

function toEditForm(m: Member): MemberUpdateInput {
    return {
        first_name: m.first_name,
        last_name: m.last_name,
        address: m.address,
        birth_date: m.birth_date,
        sexe: m.sexe,
        telephone: m.telephone,
        family_status: m.family_status,
        conversion_date: m.conversion_date,
        is_baptized: m.is_baptized,
    };
}

interface EditModalProps {
    member: Member;
    onClose: () => void;
    onSave: (id: number, data: MemberUpdateInput) => Promise<Member>;
}

export function MemberEditModal({ member, onClose, onSave }: EditModalProps) {
    const [form, setForm] = useState<MemberUpdateInput>(() => toEditForm(member));
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const { values: sexeOptions, load: loadSexe } = useParameters("sexe");
    const { values: familyOptions, load: loadFamily } = useParameters("family_status");

    useEffect(() => { loadSexe(); loadFamily(); }, [loadSexe, loadFamily]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const errs: FieldErrors = {
            telephone: validatePhone(form.telephone ?? "") ?? undefined,
            address: validateAddress(form.address ?? "") ?? undefined,
        };
        if (Object.values(errs).some(Boolean)) {
            setFieldErrors(errs);
            return;
        }
        setSaving(true);
        setError("");
        try {
            await onSave(member.id, form);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalHeaderIcon} aria-hidden>✏️</div>
                    <div className={styles.modalHeaderText}>
                        <h2 className={styles.modalName}>Modifier le membre</h2>
                        <span className={styles.modalSubtitle}>{member.email}</span>
                    </div>
                    <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGrid}>
                            <input className={styles.input} placeholder="Prénom *" required
                                value={form.first_name ?? ""}
                                onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                            <input className={styles.input} placeholder="Nom *" required
                                value={form.last_name ?? ""}
                                onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                            <input className={styles.input} placeholder="Adresse"
                                value={form.address ?? ""}
                                onChange={(e) => { setForm({ ...form, address: e.target.value || null }); setFieldErrors((fe) => ({ ...fe, address: undefined })); }} />
                            <select className={styles.select} value={form.sexe ?? ""}
                                onChange={(e) => setForm({ ...form, sexe: e.target.value || null })}>
                                <option value="">Sexe…</option>
                                {sexeOptions.map((s) => <option key={s.id} value={s.label}>{s.label}</option>)}
                            </select>
                            <input className={styles.input} placeholder="Téléphone" type="tel"
                                value={form.telephone ?? ""}
                                onChange={(e) => { setForm({ ...form, telephone: e.target.value || null }); setFieldErrors((fe) => ({ ...fe, telephone: undefined })); }} />
                            <input className={styles.input} type="date" placeholder="Date de naissance" max={YESTERDAY}
                                value={form.birth_date ?? ""}
                                onChange={(e) => setForm({ ...form, birth_date: e.target.value || null })} />
                            <select className={styles.select} value={form.family_status ?? ""}
                                onChange={(e) => setForm({ ...form, family_status: e.target.value || null })}>
                                <option value="">Statut matrimonial…</option>
                                {familyOptions.map((f) => <option key={f.id} value={f.label}>{f.label}</option>)}
                            </select>
                            <input className={styles.input} type="date" placeholder="Date de conversion" max={TODAY}
                                value={form.conversion_date ?? ""}
                                onChange={(e) => setForm({ ...form, conversion_date: e.target.value || null })} />
                            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                                <input type="checkbox" checked={!!form.is_baptized}
                                    onChange={(e) => setForm({ ...form, is_baptized: e.target.checked })} />
                                Baptisé(e)
                            </label>
                        </div>
                        {fieldErrors.telephone && <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>{fieldErrors.telephone}</p>}
                        {fieldErrors.address && <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>{fieldErrors.address}</p>}
                        {error && <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>{error}</p>}
                    </div>
                    <div className={styles.modalFooter}>
                        <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>
                            Annuler
                        </button>
                        <button type="submit" className={styles.btnPrimary} disabled={saving}>
                            {saving ? "Enregistrement…" : "Enregistrer"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
