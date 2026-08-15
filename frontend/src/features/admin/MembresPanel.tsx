import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { hasPermission, useAuth } from "../../context/AuthContext";
import { useMembers } from "../../hooks/useMembers";
import { useChurches } from "../../hooks/useChurches";
import { useParameters } from "../../hooks/useParameters";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { fetchMembersStats } from "../../lib/api/members";
import { DataTable } from "../../components/ui/DataTable";
import type { ConfirmOptions } from "../../components/ui/ConfirmDialog";
import { FamilyStatusBreakdown } from "./FamilyStatusBreakdown";
import { MemberDetailModal } from "./MemberDetailModal";
import { MemberEditModal } from "./MemberEditModal";
import { MemberImportSection } from "./MemberImportSection";
import { ApproveAllButton } from "./membres/ApproveAllButton";
import { MemberStats } from "./membres/MemberStats";
import { memberColumns } from "./membres/memberColumns";
import type { Member, MemberStatus, MemberStatusStats, MemberUpdateInput } from "../../types";

interface MembresPanelProps {
    initialStatus?: MemberStatus;
}

export function MembresPanel({ initialStatus }: MembresPanelProps) {
    const { user } = useAuth();
    const { members, total, loading, error, load, approve, approveAll, reject, deactivate, activate, edit } = useMembers();
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

    function refreshStats() {
        fetchMembersStats().then(setStats).catch(() => {});
    }

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
                refreshStats();
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

    return (
        <div className={styles.rbacWrapper}>
            {stats && <MemberStats stats={stats} />}

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
                        <ApproveAllButton
                            pendingCount={stats.pending}
                            approveAll={approveAll}
                            confirm={confirm}
                            toast={toast}
                            onApproved={() => { applyFilters(); refreshStats(); }}
                        />
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
                        columns={memberColumns({
                            onView: setSelected,
                            canEdit,
                            onEdit: setEditingMember,
                            canApprove,
                            onApprove: handleApprove,
                            onReject: handleReject,
                            onDeactivate: handleDeactivate,
                            onActivate: handleActivate,
                        })}
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
