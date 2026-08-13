import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { hasPermission, useAuth } from "../../context/AuthContext";
import { useMembers } from "../../hooks/useMembers";
import { useChurches } from "../../hooks/useChurches";
import { useParameters } from "../../hooks/useParameters";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { fetchMembersStats } from "../../lib/api/members";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import type { ConfirmOptions } from "../../components/ui/ConfirmDialog";
import { IconCheckCircle, IconClock, IconXCircle } from "../../components/ui/icons";
import { KpiCard } from "../../components/ui/KpiCard";
import { FamilyStatusBreakdown } from "./FamilyStatusBreakdown";
import { MemberDetailModal, STATUS_META } from "./MemberDetailModal";
import { MemberEditModal } from "./MemberEditModal";
import { MemberImportSection } from "./MemberImportSection";
import type { Member, MemberStatus, MemberStatusStats, MemberUpdateInput } from "../../types";

// ── Icônes KPI ────────────────────────────────────────────────────────────────

function IconMinusCircle() {
    return (
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
    );
}

// ── Panel principal ───────────────────────────────────────────────────────────

const col = createColumnHelper<Member>();

interface MembresPanelProps {
    initialStatus?: MemberStatus;
}

export function MembresPanel({ initialStatus }: MembresPanelProps) {
    const { user } = useAuth();
    const { members, total, loading, error, load, approve, approveAll, reject, deactivate, activate, edit } = useMembers();
    const [approvingAll, setApprovingAll] = useState(false);
    const { churches, load: loadChurches } = useChurches();
    const [q, setQ] = useState("");
    const [status, setStatus] = useState<MemberStatus | "">(initialStatus ?? "");
    const [familyStatus, setFamilyStatus] = useState("");
    const { values: familyStatusValues, load: loadFamilyStatusValues } = useParameters("family_status");
    const [selected, setSelected] = useState<Member | null>(null);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [stats, setStats] = useState<MemberStatusStats | null>(null);
    const { confirm, dialog } = useConfirm();
    const { toast, toasts } = useToast();

    const canApprove = hasPermission(user, "member:approve");
    const canImport = hasPermission(user, "member:create");
    const canEdit = hasPermission(user, "member:update");

    useEffect(() => {
        load({ status: initialStatus });
        loadChurches();
        loadFamilyStatusValues();
        fetchMembersStats().then(setStats).catch(() => {});
    }, [load, loadChurches, loadFamilyStatusValues, initialStatus]);

    /** Enrobe une action de changement de statut : confirmation quand elle est
     *  destructrice (refus, désactivation), toast dans tous les cas. */
    function statusAction(
        run: (id: number) => Promise<unknown>,
        successMessage: string,
        confirmOptions?: ConfirmOptions,
    ) {
        return async (id: number) => {
            if (confirmOptions && !(await confirm(confirmOptions))) return;
            try {
                await run(id);
                fetchMembersStats().then(setStats).catch(() => {});
                toast.success(successMessage);
            } catch (err) {
                toast.error(err, "Opération impossible.");
            }
        };
    }

    const handleApprove = statusAction(approve, "Membre approuvé — un courriel d'activation lui a été envoyé.");
    const handleReject = statusAction(reject, "Demande d'adhésion refusée.", {
        title: "Refuser cette demande d'adhésion ?",
        description: "Le demandeur ne pourra pas accéder à son espace membre.",
        confirmLabel: "Refuser",
        variant: "danger",
    });
    const handleDeactivate = statusAction(deactivate, "Membre désactivé.", {
        title: "Désactiver ce membre ?",
        description: "Il perd l'accès à son espace, sa fiche est conservée.",
        confirmLabel: "Désactiver",
        variant: "danger",
    });
    const handleActivate = statusAction(activate, "Membre réactivé.");

    async function handleApproveAll() {
        const ok = await confirm({
            title: "Approuver tous les membres en attente ?",
            description: `${stats?.pending ?? 0} membre${(stats?.pending ?? 0) > 1 ? "s" : ""} en attente ${(stats?.pending ?? 0) > 1 ? "seront approuvés" : "sera approuvé"} et recevr${(stats?.pending ?? 0) > 1 ? "ont" : "a"} un courriel d'activation.`,
            confirmLabel: "Tout approuver",
        });
        if (!ok) return;
        setApprovingAll(true);
        try {
            const { approved } = await approveAll();
            applyFilters();
            fetchMembersStats().then(setStats).catch(() => {});
            toast.success(`${approved} membre${approved > 1 ? "s" : ""} approuvé${approved > 1 ? "s" : ""}.`);
        } catch (err) {
            toast.error(err, "Approbation groupée impossible.");
        } finally {
            setApprovingAll(false);
        }
    }

    async function handleEditSave(id: number, payload: MemberUpdateInput) {
        const updated = await edit(id, payload);
        toast.success("Fiche membre mise à jour.");
        return updated;
    }

    function applyFilters(overrides?: { q?: string; status?: string; family_status?: string }) {
        load({
            q: (overrides?.q ?? q).trim() || undefined,
            status: (overrides?.status ?? status) as MemberStatus | undefined,
            family_status: (overrides?.family_status ?? familyStatus) || undefined,
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
                                <button className={styles.btnPrimarySm} onClick={() => handleApprove(m.id)}>
                                    Approuver
                                </button>
                                <button className={styles.btnDanger} onClick={() => handleReject(m.id)}>
                                    Refuser
                                </button>
                            </>
                        )}
                        {canApprove && m.status === "active" && (
                            <button className={styles.btnOutline} onClick={() => handleDeactivate(m.id)}>
                                Désactiver
                            </button>
                        )}
                        {canApprove && m.status === "inactive" && (
                            <button className={styles.btnPrimarySm} onClick={() => handleActivate(m.id)}>
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
            {stats && (
                <div className={styles.kpiGrid}>
                    <KpiCard color="emerald" icon={<IconCheckCircle />} value={stats.active} label="Actifs" />
                    <KpiCard color="amber" icon={<IconClock />} value={stats.pending} label="En attente" />
                    <KpiCard color="blue" icon={<IconMinusCircle />} value={stats.inactive} label="Inactifs" />
                    <KpiCard color="rose" icon={<IconXCircle />} value={stats.rejected} label="Refusés" />
                </div>
            )}

            <FamilyStatusBreakdown />

            {canImport && (
                <MemberImportSection
                    churches={churches}
                    onImported={() => applyFilters()}
                />
            )}

            <section className={styles.card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".5rem" }}>
                    <h3 className={styles.cardTitle}>Membres ({total})</h3>
                    {canApprove && !!stats?.pending && (
                        <button
                            className={styles.btnPrimarySm}
                            onClick={handleApproveAll}
                            disabled={approvingAll}
                        >
                            {approvingAll ? "Approbation…" : `Tout approuver (${stats.pending})`}
                        </button>
                    )}
                </div>

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
                    <select className={styles.select} value={familyStatus}
                        onChange={(e) => { setFamilyStatus(e.target.value); applyFilters({ family_status: e.target.value }); }}>
                        <option value="">Tous les statuts matrimoniaux</option>
                        {familyStatusValues.map((v) => (
                            <option key={v.id} value={v.label}>{v.label}</option>
                        ))}
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
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onDeactivate={handleDeactivate}
                    onActivate={handleActivate}
                />
            )}

            {editingMember && (
                <MemberEditModal
                    member={editingMember}
                    onClose={() => setEditingMember(null)}
                    onSave={handleEditSave}
                />
            )}
            {dialog}
            {toasts}
        </div>
    );
}
