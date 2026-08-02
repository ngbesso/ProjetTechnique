import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useParameters } from "../../hooks/useParameters";
import { fetchMembers } from "../../lib/api/members";
import {
    bulkAddMinistryMembers,
    exportMinistryMembers,
    fetchMinistriesStats,
    fetchMinistryMembers,
    removeMinistryAffiliation,
} from "../../lib/api/ministryAffiliations";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { formatDate } from "../../lib/format";
import type { Member, MinistryMember, MinistryStatsItem } from "../../types";

const col = createColumnHelper<MinistryMember>();

// ── Rapport : membres par ministère ───────────────────────────────────────────

interface MinistryReportProps {
    onSelectMinistry: (ministry: string) => void;
}

function MinistryReport({ onSelectMinistry }: MinistryReportProps) {
    const [stats, setStats] = useState<MinistryStatsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchMinistriesStats()
            .then(setStats)
            .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
            .finally(() => setLoading(false));
    }, []);

    return (
        <section className={styles.card}>
            <h3 className={styles.cardTitle}>Rapport — membres par ministère</h3>
            {error && <p className={styles.errorMsg} role="alert">{error}</p>}
            {loading ? (
                <p className={styles.stateMsg}>Chargement…</p>
            ) : stats.length === 0 ? (
                <p className={styles.empty}>Aucun ministère configuré.</p>
            ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: ".35rem" }}>
                    {stats.map((s) => (
                        <li
                            key={s.ministry}
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".6rem 0", borderBottom: "1px solid var(--border)" }}
                        >
                            <span>{s.ministry}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                <strong>{s.count}</strong>
                                <button className={styles.btnOutlineSm} onClick={() => onSelectMinistry(s.ministry)}>
                                    Gérer
                                </button>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

// ── Gestion : détail d'un ministère ───────────────────────────────────────────

export function MinisteresPanel() {
    const [mode, setMode] = useState<"gestion" | "rapport">("gestion");
    const { values: ministries, load: loadMinistries } = useParameters("ministry");
    const [selected, setSelected] = useState("");
    const [members, setMembers] = useState<MinistryMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [memberQuery, setMemberQuery] = useState("");
    const [selectedRemoveIds, setSelectedRemoveIds] = useState<Set<number>>(new Set());
    const [removing, setRemoving] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [candidateQuery, setCandidateQuery] = useState("");
    const [candidates, setCandidates] = useState<Member[]>([]);
    const [candidateLoading, setCandidateLoading] = useState(false);
    const [selectedAddIds, setSelectedAddIds] = useState<Set<number>>(new Set());
    const [adding, setAdding] = useState(false);
    const [addResult, setAddResult] = useState("");
    const { confirm, dialog } = useConfirm();
    const { toast, toasts } = useToast();

    useEffect(() => { loadMinistries(); }, [loadMinistries]);

    useEffect(() => {
        if (ministries.length > 0 && !selected) setSelected(ministries[0].label);
    }, [ministries, selected]);

    function loadMembers(ministry: string, query: string) {
        setLoading(true);
        setError("");
        fetchMinistryMembers(ministry, query || undefined)
            .then(setMembers)
            .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        if (!selected) return;
        setSelectedRemoveIds(new Set());
        setMemberQuery("");
        loadMembers(selected, "");
    }, [selected]);

    function toggleRemoveId(id: number) {
        setSelectedRemoveIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    async function handleRemoveOne(m: MinistryMember) {
        const name = `${m.first_name} ${m.last_name}`;
        const ok = await confirm({
            title: `Retirer ${name} du ministère « ${selected} » ?`,
            description: "Le membre reste inscrit, seule son affiliation à ce ministère est retirée.",
            confirmLabel: "Retirer",
            variant: "danger",
        });
        if (!ok) return;
        setRemoving(true);
        setError("");
        try {
            await removeMinistryAffiliation(m.id, m.affiliation_id);
            loadMembers(selected, memberQuery);
            toast.success(`${name} retiré du ministère.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur");
            toast.error(err, "Retrait impossible.");
        } finally {
            setRemoving(false);
        }
    }

    async function handleRemoveSelected() {
        const targets = members.filter((m) => selectedRemoveIds.has(m.id));
        if (targets.length === 0) return;
        const ok = await confirm({
            title: `Retirer ${targets.length} membre(s) du ministère « ${selected} » ?`,
            description: "Les membres restent inscrits, seule leur affiliation à ce ministère est retirée.",
            confirmLabel: "Retirer",
            variant: "danger",
        });
        if (!ok) return;
        setRemoving(true);
        setError("");
        try {
            for (const m of targets) {
                await removeMinistryAffiliation(m.id, m.affiliation_id);
            }
            setSelectedRemoveIds(new Set());
            loadMembers(selected, memberQuery);
            toast.success(`${targets.length} membre(s) retiré(s) du ministère.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur");
            toast.error(err, "Retrait impossible.");
        } finally {
            setRemoving(false);
        }
    }

    async function handleExportCsv() {
        if (!selected) return;
        setExporting(true);
        setError("");
        try {
            const blob = await exportMinistryMembers(selected);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `membres-${selected}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Export impossible");
        } finally {
            setExporting(false);
        }
    }

    function searchCandidates(e?: React.FormEvent) {
        e?.preventDefault();
        setCandidateLoading(true);
        fetchMembers({ q: candidateQuery || undefined, status: "active", limit: 20 })
            .then((res) => setCandidates(res.items))
            .catch(() => setCandidates([]))
            .finally(() => setCandidateLoading(false));
    }

    function toggleAddId(id: number) {
        setSelectedAddIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    async function handleBulkAdd() {
        if (!selected || selectedAddIds.size === 0) return;
        setAdding(true);
        setError("");
        setAddResult("");
        try {
            const result = await bulkAddMinistryMembers(selected, [...selectedAddIds]);
            setAddResult(
                `${result.added.length} membre(s) ajouté(s)` +
                (result.skipped.length
                    ? `, ${result.skipped.length} déjà affilié(s) ou hors périmètre.`
                    : "."),
            );
            setSelectedAddIds(new Set());
            setCandidates([]);
            setCandidateQuery("");
            loadMembers(selected, memberQuery);
            toast.success(`${result.added.length} membre(s) ajouté(s) au ministère.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur");
            toast.error(err, "Ajout impossible.");
        } finally {
            setAdding(false);
        }
    }

    const currentIds = new Set(members.map((m) => m.id));
    const restriction = ministries.find((m) => m.label === selected)?.restricted_to_sexe ?? null;
    const eligibleCandidates = candidates.filter((c) => !restriction || c.sexe === restriction);

    const memberColumns = [
        col.display({
            id: "select",
            header: "",
            cell: (info) => {
                const m = info.row.original;
                return (
                    <input
                        type="checkbox"
                        checked={selectedRemoveIds.has(m.id)}
                        onChange={() => toggleRemoveId(m.id)}
                    />
                );
            },
        }),
        col.accessor((m) => `${m.first_name} ${m.last_name}`, {
            id: "name",
            header: "Membre",
            cell: (info) => {
                const m = info.row.original;
                return (
                    <>
                        {info.getValue()} <span style={{ color: "var(--text-muted)" }}>({m.email})</span>
                    </>
                );
            },
        }),
        col.accessor("joined_at", {
            header: "Affilié depuis",
            cell: (info) => formatDate(info.getValue()),
        }),
        col.display({
            id: "actions",
            header: "",
            cell: (info) => {
                const m = info.row.original;
                return (
                    <button className={styles.btnOutlineSm} disabled={removing} onClick={() => handleRemoveOne(m)}>
                        Retirer
                    </button>
                );
            },
        }),
    ];

    return (
        <div className={styles.rbacWrapper}>
            <div className={styles.toolbar}>
                <button
                    className={mode === "gestion" ? styles.btnPrimarySm : styles.btnOutlineSm}
                    onClick={() => setMode("gestion")}
                >
                    Gestion
                </button>
                <button
                    className={mode === "rapport" ? styles.btnPrimarySm : styles.btnOutlineSm}
                    onClick={() => setMode("rapport")}
                >
                    Rapport
                </button>
            </div>

            {mode === "rapport" ? (
                <MinistryReport onSelectMinistry={(ministry) => { setSelected(ministry); setMode("gestion"); }} />
            ) : (
                <>
                    <section className={styles.card}>
                        <h3 className={styles.cardTitle}>Ministères</h3>
                        <div className={styles.toolbar}>
                            <select
                                className={styles.select}
                                value={selected}
                                onChange={(e) => setSelected(e.target.value)}
                            >
                                <option value="">Choisir un ministère…</option>
                                {ministries.map((m) => (
                                    <option key={m.id} value={m.label}>{m.label}</option>
                                ))}
                            </select>
                            {selected && (
                                <button className={styles.btnOutlineSm} disabled={exporting} onClick={handleExportCsv}>
                                    {exporting ? "…" : "⭳ Exporter (CSV)"}
                                </button>
                            )}
                        </div>

                        {error && <p className={styles.errorMsg} role="alert">{error}</p>}

                        {selected && (
                            <>
                                <form
                                    onSubmit={(e) => { e.preventDefault(); loadMembers(selected, memberQuery); }}
                                    className={styles.toolbar}
                                    style={{ marginTop: "1rem" }}
                                >
                                    <input
                                        className={styles.input}
                                        placeholder="Rechercher parmi les membres affiliés (nom, courriel)…"
                                        value={memberQuery}
                                        onChange={(e) => setMemberQuery(e.target.value)}
                                    />
                                    <button type="submit" className={styles.btnOutlineSm}>Rechercher</button>
                                </form>

                                {selectedRemoveIds.size > 0 && (
                                    <div style={{ margin: ".75rem 0" }}>
                                        <button
                                            className={styles.btnDanger}
                                            disabled={removing}
                                            onClick={handleRemoveSelected}
                                        >
                                            {removing ? "…" : `Retirer la sélection (${selectedRemoveIds.size})`}
                                        </button>
                                    </div>
                                )}

                                {loading ? (
                                    <p className={styles.stateMsg}>Chargement…</p>
                                ) : (
                                    <div style={{ marginTop: "1rem" }}>
                                        <DataTable
                                            columns={memberColumns}
                                            data={members}
                                            getRowId={(m) => m.affiliation_id}
                                            emptyMessage="Aucun membre actuellement affilié."
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </section>

                    {selected && (
                        <section className={styles.card}>
                            <h3 className={styles.cardTitle}>Ajouter des membres à « {selected} »</h3>
                            <form onSubmit={searchCandidates} className={styles.toolbar}>
                                <input
                                    className={styles.input}
                                    placeholder="Rechercher un membre (nom, courriel)…"
                                    value={candidateQuery}
                                    onChange={(e) => setCandidateQuery(e.target.value)}
                                />
                                <button type="submit" className={styles.btnOutlineSm} disabled={candidateLoading}>
                                    {candidateLoading ? "…" : "Rechercher"}
                                </button>
                            </form>

                            {restriction && (
                                <p style={{ fontSize: ".8rem", color: "var(--text-muted)", margin: ".5rem 0 0" }}>
                                    Ce ministère est réservé aux membres de sexe « {restriction} ».
                                </p>
                            )}

                            {eligibleCandidates.length > 0 && (
                                <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0", display: "flex", flexDirection: "column", gap: ".35rem" }}>
                                    {eligibleCandidates.map((c) => (
                                        <li key={c.id} style={{ display: "flex", alignItems: "center", gap: ".75rem", fontSize: ".9rem" }}>
                                            <input
                                                type="checkbox"
                                                disabled={currentIds.has(c.id)}
                                                checked={selectedAddIds.has(c.id)}
                                                onChange={() => toggleAddId(c.id)}
                                            />
                                            <span>
                                                {c.first_name} {c.last_name}{" "}
                                                <span style={{ color: "var(--text-muted)" }}>({c.email})</span>
                                                {currentIds.has(c.id) && (
                                                    <span style={{ color: "var(--text-muted)" }}> — déjà affilié</span>
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {selectedAddIds.size > 0 && (
                                <button className={styles.btnPrimary} disabled={adding} onClick={handleBulkAdd}>
                                    {adding ? "…" : `Ajouter la sélection (${selectedAddIds.size})`}
                                </button>
                            )}
                            {addResult && (
                                <p style={{ color: "var(--vivid-violet)", fontSize: ".85rem", marginTop: ".5rem" }}>
                                    {addResult}
                                </p>
                            )}
                        </section>
                    )}
                </>
            )}
            {dialog}
            {toasts}
        </div>
    );
}
