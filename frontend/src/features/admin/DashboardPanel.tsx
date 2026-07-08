import { useEffect, useState } from "react";
import styles from "./DashboardPanel.module.css";
import {
    fetchDashboardStats,
    DashboardStats,
    PendingMemberItem,
} from "../../lib/api/dashboard";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconUsers() {
    return (
        <svg viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function IconClock() {
    return (
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

function IconDollar() {
    return (
        <svg viewBox="0 0 24 24">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    );
}

function IconBook() {
    return (
        <svg viewBox="0 0 24 24">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
    );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiProps {
    color: "violet" | "amber" | "emerald" | "blue";
    icon: React.ReactNode;
    value: string | number;
    label: string;
    sub: string;
}

function KpiCard({ color, icon, value, label, sub }: KpiProps) {
    return (
        <div className={`${styles.kpiCard} ${styles[color]}`}>
            <div className={`${styles.kpiIcon} ${styles[color]}`}>{icon}</div>
            <div className={styles.kpiBody}>
                <div className={styles.kpiLabel}>{label}</div>
                <div className={styles.kpiValue}>{value}</div>
                <div className={styles.kpiSub}>{sub}</div>
            </div>
        </div>
    );
}

// ── Bar chart ─────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: { label: string; value: number }[] }) {
    const max = Math.max(...data.map((d) => d.value), 1);
    return (
        <div className={styles.barChart}>
            {data.map((d, i) => (
                <div key={i} className={styles.barCol}>
                    <div className={styles.barWrap}>
                        <div
                            className={styles.bar}
                            style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 6 : 2)}%` }}
                        >
                            {d.value > 0 && (
                                <span className={styles.barVal}>{d.value}</span>
                            )}
                        </div>
                    </div>
                    <span className={styles.barLabel}>{d.label}</span>
                </div>
            ))}
        </div>
    );
}

// ── Donut chart ───────────────────────────────────────────────────────────────

interface DonutProps {
    active: number;
    pending: number;
    inactive: number;
    rejected: number;
    total: number;
}

const STATUS_COLORS = {
    active: "#7c3aed",
    pending: "#f59e0b",
    inactive: "#94a3b8",
    rejected: "#ef4444",
};

function pct(n: number, total: number) {
    return total > 0 ? (n / total) * 360 : 0;
}

function DonutChart({ active, pending, inactive, rejected, total }: DonutProps) {
    const a = pct(active, total);
    const p = pct(pending, total);
    const i = pct(inactive, total);

    const gradient = total > 0
        ? `conic-gradient(
            ${STATUS_COLORS.active} 0deg ${a}deg,
            ${STATUS_COLORS.pending} ${a}deg ${a + p}deg,
            ${STATUS_COLORS.inactive} ${a + p}deg ${a + p + i}deg,
            ${STATUS_COLORS.rejected} ${a + p + i}deg 360deg
          )`
        : `conic-gradient(#e2e8f0 0deg 360deg)`;

    const legend: { key: string; label: string; count: number; color: string }[] = [
        { key: "active", label: "Actifs", count: active, color: STATUS_COLORS.active },
        { key: "pending", label: "En attente", count: pending, color: STATUS_COLORS.pending },
        { key: "inactive", label: "Inactifs", count: inactive, color: STATUS_COLORS.inactive },
        { key: "rejected", label: "Refusés", count: rejected, color: STATUS_COLORS.rejected },
    ];

    return (
        <div className={styles.donutWrap}>
            <div
                className={styles.donutRing}
                style={{ background: gradient }}
            >
                <div className={styles.donutHole}>
                    <div className={styles.donutTotal}>{total}</div>
                    <div className={styles.donutSub}>membres</div>
                </div>
            </div>
            <div className={styles.donutLegend}>
                {legend.map((item) => (
                    <div key={item.key} className={styles.legendRow}>
                        <span
                            className={styles.legendDot}
                            style={{ background: item.color }}
                        />
                        <span>{item.label}</span>
                        <span className={styles.legendCount}>{item.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Category bars ─────────────────────────────────────────────────────────────

const CAT_LABELS: Record<string, string> = {
    soutien_spirituel: "Soutien spirituel",
    action_communautaire: "Action communautaire",
    developpement: "Développement",
};

function CategoryBars({ byCategory }: { byCategory: Record<string, number> }) {
    const entries = Object.entries(byCategory);
    const max = Math.max(...entries.map(([, v]) => v), 1);

    if (entries.length === 0) {
        return <p className={styles.emptyState}>Aucun don enregistré</p>;
    }

    return (
        <div className={styles.catList}>
            {entries.map(([cat, amount]) => (
                <div key={cat} className={styles.catItem}>
                    <div className={styles.catHeader}>
                        <span className={styles.catLabel}>
                            {CAT_LABELS[cat] ?? cat}
                        </span>
                        <span className={styles.catAmount}>
                            {amount.toLocaleString("fr-CA", {
                                style: "currency",
                                currency: "CAD",
                                maximumFractionDigits: 0,
                            })}
                        </span>
                    </div>
                    <div className={styles.catBar}>
                        <div
                            className={styles.catFill}
                            style={{ width: `${(amount / max) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Pending member item ───────────────────────────────────────────────────────

function PendingRow({ m }: { m: PendingMemberItem }) {
    const initials = `${m.first_name[0] ?? ""}${m.last_name[0] ?? ""}`.toUpperCase();
    return (
        <div className={styles.pendingItem}>
            <div className={styles.pendingAvatar}>{initials}</div>
            <div className={styles.pendingInfo}>
                <div className={styles.pendingName}>
                    {m.first_name} {m.last_name}
                </div>
                <div className={styles.pendingDate}>{m.created_at}</div>
            </div>
            <span className={styles.pendingBadge}>En attente</span>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardPanel() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchDashboardStats()
            .then(setStats)
            .catch(() => setError("Impossible de charger les statistiques."));
    }, []);

    const today = new Date().toLocaleDateString("fr-CA", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className={styles.panel}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Tableau de bord</h1>
                <p className={styles.pageSubtitle}>{today}</p>
            </div>

            {error && <div className={styles.errorBox}>{error}</div>}

            {!stats ? (
                <div className={styles.loader}>Chargement des statistiques…</div>
            ) : (
                <>
                    {/* KPI row */}
                    <div className={styles.kpiGrid}>
                        <KpiCard
                            color="violet"
                            icon={<IconUsers />}
                            value={stats.membres.total}
                            label="Membres"
                            sub={`dont ${stats.membres.active} actifs`}
                        />
                        <KpiCard
                            color="amber"
                            icon={<IconClock />}
                            value={stats.membres.pending}
                            label="En attente"
                            sub="demandes à traiter"
                        />
                        <KpiCard
                            color="emerald"
                            icon={<IconDollar />}
                            value={stats.dons.total_cad.toLocaleString("fr-CA", {
                                style: "currency",
                                currency: "CAD",
                                maximumFractionDigits: 0,
                            })}
                            label="Dons (CAD)"
                            sub={`${stats.dons.count} transaction${stats.dons.count !== 1 ? "s" : ""}`}
                        />
                        <KpiCard
                            color="blue"
                            icon={<IconBook />}
                            value={stats.sermons.published}
                            label="Sermons publiés"
                            sub={`${stats.sermons.draft} brouillon${stats.sermons.draft !== 1 ? "s" : ""}`}
                        />
                    </div>

                    {/* Charts row */}
                    <div className={styles.chartsRow}>
                        <div className={styles.chartCard}>
                            <div className={styles.chartTitle}>
                                Inscriptions mensuelles
                            </div>
                            <BarChart
                                data={stats.membres.by_month.map((m) => ({
                                    label: m.month,
                                    value: m.count,
                                }))}
                            />
                        </div>
                        <div className={styles.chartCard}>
                            <div className={styles.chartTitle}>
                                Répartition des membres
                            </div>
                            <DonutChart
                                active={stats.membres.active}
                                pending={stats.membres.pending}
                                inactive={stats.membres.inactive}
                                rejected={stats.membres.rejected}
                                total={stats.membres.total}
                            />
                        </div>
                    </div>

                    {/* Bottom row */}
                    <div className={styles.bottomRow}>
                        <div className={styles.chartCard}>
                            <div className={styles.chartTitle}>
                                Membres en attente
                            </div>
                            {stats.recent_pending.length === 0 ? (
                                <p className={styles.emptyState}>
                                    Aucune demande en attente
                                </p>
                            ) : (
                                <div className={styles.pendingList}>
                                    {stats.recent_pending.map((m) => (
                                        <PendingRow key={m.id} m={m} />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className={styles.chartCard}>
                            <div className={styles.chartTitle}>
                                Dons par catégorie
                            </div>
                            <CategoryBars byCategory={stats.dons.by_category} />
                        </div>

                        <div className={styles.chartCard}>
                            <div className={styles.chartTitle}>Églises</div>
                            <div className={styles.churchStats}>
                                <div className={styles.churchBig}>
                                    <div className={styles.churchNum}>
                                        {stats.eglises.total}
                                    </div>
                                    <div className={styles.churchLabel}>
                                        église{stats.eglises.total !== 1 ? "s" : ""} enregistrée{stats.eglises.total !== 1 ? "s" : ""}
                                    </div>
                                </div>
                                <div className={styles.churchBreakdown}>
                                    <div className={styles.churchBreakItem}>
                                        <div className={styles.churchBreakNum}>
                                            {stats.eglises.total - stats.eglises.affiliates}
                                        </div>
                                        <div className={styles.churchBreakLabel}>
                                            mère
                                        </div>
                                    </div>
                                    <div className={styles.churchBreakItem}>
                                        <div className={styles.churchBreakNum}>
                                            {stats.eglises.affiliates}
                                        </div>
                                        <div className={styles.churchBreakLabel}>
                                            affiliée{stats.eglises.affiliates !== 1 ? "s" : ""}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
