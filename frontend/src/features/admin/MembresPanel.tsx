import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useMembers } from "../../hooks/useMembers";
import { useChurches } from "../../hooks/useChurches";
import type { Church, Member, MemberStatus } from "../../types";

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
                    <div>
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

// ── Panel principal ───────────────────────────────────────────────────────────

interface MembresPanelProps {
    initialStatus?: MemberStatus;
}

export function MembresPanel({ initialStatus }: MembresPanelProps) {
    const { user } = useAuth();
    const { members, total, loading, error, load, approve, reject, deactivate, activate } = useMembers();
    const { churches, load: loadChurches } = useChurches();
    const [q, setQ] = useState("");
    const [status, setStatus] = useState<MemberStatus | "">(initialStatus ?? "");
    const [selected, setSelected] = useState<Member | null>(null);

    const canApprove =
        user?.permissions.includes("*") || user?.permissions.includes("member:approve");

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

    return (
        <div className={styles.rbacWrapper}>
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
                                <th className={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((m) => {
                                const meta = STATUS_META[m.status];
                                return (
                                    <tr key={m.id}>
                                        <td className={styles.td}>
                                            <strong>{m.first_name} {m.last_name}</strong>
                                        </td>
                                        <td className={styles.td}>{m.email}</td>
                                        <td className={styles.td}>
                                            <span className={`${styles.badge} ${styles[meta.cls]}`}>
                                                {meta.label}
                                            </span>
                                        </td>
                                        <td className={styles.td}>{m.is_baptized ? "Oui" : "Non"}</td>
                                        <td className={styles.td}>
                                            <div className={styles.actions}>
                                                <button className={styles.btnOutlineSm}
                                                    onClick={() => setSelected(m)}>
                                                    Voir
                                                </button>
                                                {canApprove && m.status === "pending" && (
                                                    <>
                                                        <button className={styles.btnPrimarySm}
                                                            onClick={() => approve(m.id)}>
                                                            Approuver
                                                        </button>
                                                        <button className={styles.btnDanger}
                                                            onClick={() => reject(m.id)}>
                                                            Refuser
                                                        </button>
                                                    </>
                                                )}
                                                {canApprove && m.status === "active" && (
                                                    <button className={styles.btnOutline}
                                                        onClick={() => deactivate(m.id)}>
                                                        Désactiver
                                                    </button>
                                                )}
                                                {canApprove && m.status === "inactive" && (
                                                    <button className={styles.btnPrimarySm}
                                                        onClick={() => activate(m.id)}>
                                                        Activer
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
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
        </div>
    );
}
