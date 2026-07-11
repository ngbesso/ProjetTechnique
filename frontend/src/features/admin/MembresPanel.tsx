import { useEffect, useRef, useState } from "react";
import styles from "./AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useMembers } from "../../hooks/useMembers";
import { useChurches } from "../../hooks/useChurches";
import { useParameters } from "../../hooks/useParameters";
import { downloadImportTemplate, importMembers } from "../../lib/api/members";
import { validatePhone, validateAddress } from "../../lib/validation";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import type { Church, Member, MemberImportResult, MemberStatus, MemberUpdateInput } from "../../types";

const TODAY = new Date().toISOString().split("T")[0];

const STATUS_META: Record<MemberStatus, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "badgePending" },
    active: { label: "Actif", cls: "badgeActive" },
    inactive: { label: "Inactif", cls: "badgeInactive" },
    rejected: { label: "Refusé", cls: "badgeRejected" },
};

function formatDate(d: string | null | undefined): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-CA", {
        year: "numeric", month: "long", day: "numeric",
    });
}

// ── Modale détail membre ──────────────────────────────────────────────────────

interface ModalProps {
    member: Member;
    church: Church | undefined;
    canApprove: boolean;
    onClose: () => void;
    onApprove: (id: number) => Promise<void>;
    onReject: (id: number) => Promise<void>;
    onDeactivate: (id: number) => Promise<void>;
    onActivate: (id: number) => Promise<void>;
}

function MemberDetailModal({ member, church, canApprove, onClose, onApprove, onReject, onDeactivate, onActivate }: ModalProps) {
    const [busy, setBusy] = useState(false);
    const meta = STATUS_META[member.status];

    async function act(fn: () => Promise<void>) {
        setBusy(true);
        try { await fn(); onClose(); } finally { setBusy(false); }
    }

    const churchLabel = church
        ? `${church.name}${church.district ? ` — ${church.district}` : ""}`
        : "—";

    const churchFieldLabel = member.status === "active" ? "Église" : "Église souhaitée";

    const details: { label: string; value: string }[] = [
        { label: "Code membre", value: member.member_code ?? "—" },
        { label: churchFieldLabel, value: churchLabel },
        { label: "Courriel", value: member.email },
        { label: "Téléphone", value: member.telephone ?? "—" },
        { label: "Adresse", value: member.address ?? "—" },
        { label: "Sexe", value: member.sexe ?? "—" },
        { label: "Date de naissance", value: formatDate(member.birth_date) },
        { label: "Statut familial", value: member.family_status ?? "—" },
        { label: "Baptême", value: member.is_baptized ? "Baptisé(e)" : "Non baptisé(e)" },
        { label: "Inscrit le", value: formatDate(member.created_at) },
    ];

    const showFooter = canApprove && (
        member.status === "pending" ||
        member.status === "active" ||
        member.status === "inactive"
    );

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>

                <div className={styles.modalHeader}>
                    <div className={styles.modalHeaderIcon}>👤</div>
                    <div className={styles.modalHeaderText}>
                        <h2 className={styles.modalName}>
                            {member.first_name} {member.last_name}
                        </h2>
                        <span className={`${styles.badge} ${styles[meta.cls]}`}>
                            {meta.label}
                        </span>
                    </div>
                    <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
                        ✕
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <dl className={styles.detailGrid}>
                        {details.map(({ label, value }) => (
                            <div key={label} className={styles.detailRow}>
                                <dt className={styles.detailKey}>{label}</dt>
                                <dd className={styles.detailVal}>{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                {showFooter && (
                    <div className={styles.modalFooter}>
                        {member.status === "pending" && (
                            <>
                                <button className={styles.btnDanger} disabled={busy}
                                    onClick={() => act(() => onReject(member.id))}>
                                    Refuser
                                </button>
                                <button className={styles.btnPrimary} disabled={busy}
                                    onClick={() => act(() => onApprove(member.id))}>
                                    {busy ? "…" : "Approuver"}
                                </button>
                            </>
                        )}
                        {member.status === "active" && (
                            <button className={styles.btnOutline} disabled={busy}
                                onClick={() => act(() => onDeactivate(member.id))}>
                                {busy ? "…" : "Désactiver"}
                            </button>
                        )}
                        {member.status === "inactive" && (
                            <button className={styles.btnPrimary} disabled={busy}
                                onClick={() => act(() => onActivate(member.id))}>
                                {busy ? "…" : "Activer"}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Modale édition membre ──────────────────────────────────────────────────────

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

function MemberEditModal({ member, onClose, onSave }: EditModalProps) {
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
                    <div className={styles.modalHeaderIcon}>✏️</div>
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
                            <input className={styles.input} type="date" placeholder="Date de naissance" max={TODAY}
                                value={form.birth_date ?? ""}
                                onChange={(e) => setForm({ ...form, birth_date: e.target.value || null })} />
                            <select className={styles.select} value={form.family_status ?? ""}
                                onChange={(e) => setForm({ ...form, family_status: e.target.value || null })}>
                                <option value="">Statut familial…</option>
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

// ── Import Excel/CSV en masse ───────────────────────────────────────────────────

interface ImportSectionProps {
    churches: Church[];
    onImported: () => void;
}

function MemberImportSection({ churches, onImported }: ImportSectionProps) {
    const [churchId, setChurchId] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<MemberImportResult | null>(null);
    const [error, setError] = useState("");
    const [templateError, setTemplateError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleDownloadTemplate() {
        setTemplateError("");
        try {
            await downloadImportTemplate();
        } catch (err) {
            setTemplateError(err instanceof Error ? err.message : "Erreur lors du téléchargement");
        }
    }

    async function handleImport(e: React.FormEvent) {
        e.preventDefault();
        if (!churchId || !file) return;
        setImporting(true);
        setError("");
        setResult(null);
        try {
            const res = await importMembers(+churchId, file);
            setResult(res);
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            onImported();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur lors de l'import");
        } finally {
            setImporting(false);
        }
    }

    return (
        <section className={styles.card}>
            <h3 className={styles.cardTitle}>Importer des membres</h3>
            <p className={styles.helpText}>
                Fichier Excel (.xlsx) ou CSV avec les colonnes <code>first_name, last_name, email</code> (requises) et
                optionnellement <code>address, birth_date, sexe, telephone, family_status, conversion_date, is_baptized</code>.
                Les membres importés sont créés directement en statut actif.{" "}
                <button type="button" className={styles.btnGhost} style={{ padding: 0 }}
                    onClick={handleDownloadTemplate}>
                    Télécharger le modèle Excel
                </button>
            </p>
            {templateError && <p className={styles.errorMsg} role="alert">{templateError}</p>}
            <form onSubmit={handleImport} className={styles.inlineForm} style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                <select className={styles.select} value={churchId}
                    onChange={(e) => setChurchId(e.target.value)} required>
                    <option value="">Église…</option>
                    {churches.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}{c.is_mother ? " (mère)" : ""}</option>
                    ))}
                </select>
                <input ref={fileInputRef} className={styles.input} type="file"
                    accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <button type="submit" className={styles.btnPrimary} disabled={importing || !churchId || !file}>
                    {importing ? "Import en cours…" : "Importer"}
                </button>
            </form>

            {error && <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>{error}</p>}

            {result && (
                <div style={{ marginTop: "0.9rem" }}>
                    <p style={{ fontSize: "0.875rem" }}>
                        <strong>{result.created}</strong> membre{result.created > 1 ? "s" : ""} créé{result.created > 1 ? "s" : ""}
                        {result.errors.length > 0 && <> · <strong>{result.errors.length}</strong> erreur{result.errors.length > 1 ? "s" : ""}</>}
                    </p>
                    {result.errors.length > 0 && (
                        <table className={styles.table} style={{ marginTop: "0.5rem" }}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Ligne</th>
                                    <th className={styles.th}>Courriel</th>
                                    <th className={styles.th}>Erreur</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.errors.map((e, i) => (
                                    <tr key={i}>
                                        <td className={styles.td}>{e.row}</td>
                                        <td className={styles.td}>{e.email ?? "—"}</td>
                                        <td className={styles.td}>{e.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </section>
    );
}

// ── Panel principal ───────────────────────────────────────────────────────────

const col = createColumnHelper<Member>();

interface MembresPanelProps {
    initialStatus?: MemberStatus;
}

export function MembresPanel({ initialStatus }: MembresPanelProps) {
    const { user } = useAuth();
    const { members, total, loading, error, load, approve, reject, deactivate, activate, edit } = useMembers();
    const { churches, load: loadChurches } = useChurches();
    const [q, setQ] = useState("");
    const [status, setStatus] = useState<MemberStatus | "">(initialStatus ?? "");
    const [selected, setSelected] = useState<Member | null>(null);
    const [editingMember, setEditingMember] = useState<Member | null>(null);

    const canApprove =
        user?.permissions.includes("*") || user?.permissions.includes("member:approve");
    const canImport =
        user?.permissions.includes("*") || user?.permissions.includes("member:create");
    const canEdit =
        user?.permissions.includes("*") || user?.permissions.includes("member:update");

    useEffect(() => {
        load({ status: initialStatus });
        loadChurches();
    }, [load, loadChurches, initialStatus]);

    function applyFilters(overrides?: { q?: string; status?: string }) {
        load({
            q: (overrides?.q ?? q).trim() || undefined,
            status: (overrides?.status ?? status) as MemberStatus | undefined,
        });
    }

    const columns = [
        col.accessor("member_code", { header: "Numéro de membre" }),
        col.accessor((m) => `${m.first_name} ${m.last_name}`, {
            id: "name",
            header: "Nom",
            cell: (info) => <strong>{info.getValue()}</strong>,
        }),
        col.accessor("email", { header: "Courriel" }),
        col.accessor("telephone", { header: "Telephone" }),

        col.accessor("status", {
            header: "Statut",
            cell: (info) => {
                const meta = STATUS_META[info.getValue()];
                return <span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span>;
            },
        }),
        col.accessor("is_baptized", {
            header: "Baptisé",
            cell: (info) => (info.getValue() ? "Oui" : "Non"),
        }),
        col.display({
            id: "actions",
            header: "Actions",
            cell: (info) => {
                const m = info.row.original;
                return (
                    <div className={styles.actions}>
                        <button className={styles.btnOutlineSm} onClick={() => setSelected(m)}>
                            Voir
                        </button>
                        {canEdit && (
                            <button className={styles.btnOutlineSm} onClick={() => setEditingMember(m)}>
                                Modifier
                            </button>
                        )}
                        {canApprove && m.status === "pending" && (
                            <>
                                <button className={styles.btnPrimarySm} onClick={() => approve(m.id)}>
                                    Approuver
                                </button>
                                <button className={styles.btnDanger} onClick={() => reject(m.id)}>
                                    Refuser
                                </button>
                            </>
                        )}
                        {canApprove && m.status === "active" && (
                            <button className={styles.btnOutline} onClick={() => deactivate(m.id)}>
                                Désactiver
                            </button>
                        )}
                        {canApprove && m.status === "inactive" && (
                            <button className={styles.btnPrimarySm} onClick={() => activate(m.id)}>
                                Activer
                            </button>
                        )}
                    </div>
                );
            },
        }),
    ];

    return (
        <div className={styles.rbacWrapper}>
            {canImport && (
                <MemberImportSection
                    churches={churches}
                    onImported={() => applyFilters()}
                />
            )}

            <section className={styles.card}>
                <h3 className={styles.cardTitle}>Membres ({total})</h3>

                <form onSubmit={(e) => { e.preventDefault(); applyFilters(); }} className={styles.toolbar}>
                    <input className={styles.input} placeholder="Rechercher (nom, courriel)…"
                        value={q} onChange={(e) => { setQ(e.target.value); applyFilters({ q: e.target.value }); }} />
                    <select className={styles.select} value={status}
                        onChange={(e) => { setStatus(e.target.value as MemberStatus | ""); applyFilters({ status: e.target.value }); }}>
                        <option value="">Tous les statuts</option>
                        <option value="pending">En attente</option>
                        <option value="active">Actif</option>
                        <option value="inactive">Inactif</option>
                        <option value="rejected">Refusé</option>
                    </select>
                </form>

                {error && <p className={styles.errorMsg} role="alert">{error}</p>}

                {loading ? (
                    <p className={styles.stateMsg}>Chargement…</p>
                ) : (
                    <DataTable
                        columns={columns}
                        data={members}
                        getRowId={(m) => m.id}
                        emptyMessage="Aucun membre dans votre périmètre."
                    />
                )}
            </section>

            {selected && (
                <MemberDetailModal
                    member={selected}
                    church={churches.find((c) => c.id === selected.church_id)}
                    canApprove={!!canApprove}
                    onClose={() => setSelected(null)}
                    onApprove={approve}
                    onReject={reject}
                    onDeactivate={deactivate}
                    onActivate={activate}
                />
            )}

            {editingMember && (
                <MemberEditModal
                    member={editingMember}
                    onClose={() => setEditingMember(null)}
                    onSave={edit}
                />
            )}
        </div>
    );
}
