import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useParameters } from "../../hooks/useParameters";
import { fetchFamilyStatusStats } from "../../lib/api/members";
import { KpiCard, type KpiColor } from "../../components/ui/KpiCard";

const FAMILY_STATUS_COLORS: KpiColor[] = ["violet", "amber", "emerald", "blue", "rose"];

function IconRing() {
    return (
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="14" r="6" />
            <path d="M9 8l3-5 3 5" />
        </svg>
    );
}

export function FamilyStatusBreakdown() {
    const { values, load } = useParameters("family_status");
    const [counts, setCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        load();
        fetchFamilyStatusStats().then(setCounts).catch(() => {});
    }, [load]);

    const entries = values.filter((v) => counts[v.label]);
    if (entries.length === 0) return null;

    return (
        <section className={styles.card}>
            <h3 className={styles.cardTitle}>Répartition par statut matrimonial</h3>
            <div className={styles.kpiGrid}>
                {entries.map((v, i) => (
                    <KpiCard
                        key={v.id}
                        color={FAMILY_STATUS_COLORS[i % FAMILY_STATUS_COLORS.length]}
                        icon={<IconRing />}
                        value={counts[v.label]}
                        label={v.label}
                    />
                ))}
            </div>
        </section>
    );
}
