import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { fetchMemberMinistryHistory } from "../../lib/api/ministryAffiliations";
import { formatDate } from "../../lib/format";
import type { Church, Member, MemberStatus, MinistryAffiliation } from "../../types";

export const STATUS_META: Record<MemberStatus, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "badgePending" },
    active: { label: "Actif", cls: "badgeActive" },
    inactive: { label: "Inactif", cls: "badgeInactive" },
    rejected: { label: "Refusé", cls: "badgeRejected" },
};

// ── Historique des ministères d'un membre (lecture seule) ─────────────────────

function MemberMinistryHistory({ memberId }: { memberId: number }) {
    const [history, setHistory] = useState<MinistryAffiliation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchMemberMinistryHistory(memberId)
            .then(setHistory)
            .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
            .finally(() => setLoading(false));
    }, [memberId]);

    return (
        <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
            <p style={{ margin: "0 0 .5rem", fontWeight: 600, fontSize: ".8rem", color: "var(--text-muted)" }}>
                Historique des ministères
            </p>
            {error && <p className={styles.errorMsg} role="alert">{error}</p>}
            {loading ? (
                <p className={styles.stateMsg}>Chargement…</p>
            ) : history.length === 0 ? (
                <p className={styles.empty}>Aucune affiliation à un ministère.</p>
            ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: ".4rem" }}>
                    {history.map((a) => (
                        <li key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: ".85rem" }}>
                            <span>
                                {a.ministry}
                                {!a.left_at && (
                                    <span style={{ marginLeft: ".4rem", color: "var(--vivid-violet)", fontSize: ".75rem" }}>
                                        (actif)
                                    </span>
                                )}
                            </span>
                            <span style={{ color: "var(--text-muted)" }}>
                                {formatDate(a.joined_at)} → {a.left_at ? formatDate(a.left_at) : "—"}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
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

export function MemberDetailModal({ member, church, canApprove, onClose, onApprove, onReject, onDeactivate, onActivate }: ModalProps) {
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
        { label: "Statut matrimonial", value: member.family_status ?? "—" },
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

                    <MemberMinistryHistory memberId={member.id} />
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
