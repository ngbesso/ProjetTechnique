import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { hasPermission, useAuth } from "../../context/AuthContext";
import { useMembers } from "../../hooks/useMembers";
import { useChurches } from "../../hooks/useChurches";
import { useParameters } from "../../hooks/useParameters";
import { fetchMembersStats } from "../../lib/api/members";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import { IconCheckCircle, IconXCircle } from "../../components/ui/icons";
import { KpiCard } from "../../components/ui/KpiCard";
import { FamilyStatusBreakdown } from "./FamilyStatusBreakdown";
import { MemberDetailModal, STATUS_META } from "./MemberDetailModal";
import { MemberEditModal } from "./MemberEditModal";
import { MemberImportSection } from "./MemberImportSection";
import type { Member, MemberStatus, MemberStatusStats } from "../../types";

// ── Icônes KPI ────────────────────────────────────────────────────────────────

function IconClock() {
    return (
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

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
    const { members, total, loading, error, load, approve, reject, deactivate, activate, edit } = useMembers();
    const { churches, load: loadChurches } = useChurches();
    const [q, setQ] = useState("");
    const [status, setStatus] = useState<MemberStatus | "">(initialStatus ?? "");
    const [familyStatus, setFamilyStatus] = useState("");
    const { values: familyStatusValues, load: loadFamilyStatusValues } = useParameters("family_status");
    const [selected, setSelected] = useState<Member | null>(null);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [stats, setStats] = useState<MemberStatusStats | null>(null);

    const canApprove = hasPermission(user, "member:approve");
    const canImport = hasPermission(user, "member:create");
    const canEdit = hasPermission(user, "member:update");

    useEffect(() => {
        load({ status: initialStatus });
        loadChurches();
        loadFamilyStatusValues();
        fetchMembersStats().then(setStats).catch(() => {});
    }, [load, loadChurches, loadFamilyStatusValues, initialStatus]);

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
