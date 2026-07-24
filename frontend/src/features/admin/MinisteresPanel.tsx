import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useParameters } from "../../hooks/useParameters";
import { fetchMembers } from "../../lib/api/members";
import {
    bulkAddMinistryMembers,
    fetchMinistryMembers,
    removeMinistryAffiliation,
} from "../../lib/api/ministryAffiliations";
import type { Member, MinistryMember } from "../../types";

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("fr-CA", {
        year: "numeric", month: "long", day: "numeric",
    });
}

export function MinisteresPanel() {
    const { values: ministries, load: loadMinistries } = useParameters("ministry");
    const [selected, setSelected] = useState("");
    const [members, setMembers] = useState<MinistryMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [memberQuery, setMemberQuery] = useState("");
    const [selectedRemoveIds, setSelectedRemoveIds] = useState<Set<number>>(new Set());
    const [removing, setRemoving] = useState(false);

    const [candidateQuery, setCandidateQuery] = useState("");
    const [candidates, setCandidates] = useState<Member[]>([]);
    const [candidateLoading, setCandidateLoading] = useState(false);
    const [selectedAddIds, setSelectedAddIds] = useState<Set<number>>(new Set());
    const [adding, setAdding] = useState(false);
    const [addResult, setAddResult] = useState("");

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected]);

    function toggleRemoveId(id: number) {
        setSelectedRemoveIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    async function handleRemoveOne(m: MinistryMember) {
        setRemoving(true);
        setError("");
        try {
            await removeMinistryAffiliation(m.id, m.affiliation_id);
            loadMembers(selected, memberQuery);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur");
        } finally {
            setRemoving(false);
        }
    }

    async function handleRemoveSelected() {
        setRemoving(true);
        setError("");
        try {
            const targets = members.filter((m) => selectedRemoveIds.has(m.id));
            for (const m of targets) {
                await removeMinistryAffiliation(m.id, m.affiliation_id);
            }
            setSelectedRemoveIds(new Set());
            loadMembers(selected, memberQuery);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur");
        } finally {
            setRemoving(false);
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
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur");
        } finally {
            setAdding(false);
        }
    }

    const currentIds = new Set(members.map((m) => m.id));

    return (
        <div className={styles.rbacWrapper}>
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
                        ) : members.length === 0 ? (
                            <p className={styles.empty}>Aucun membre actuellement affilié.</p>
                        ) : (
                            <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0", display: "flex", flexDirection: "column", gap: ".35rem" }}>
                                {members.map((m) => (
                                    <li
                                        key={m.affiliation_id}
                                        style={{ display: "flex", alignItems: "center", gap: ".75rem", fontSize: ".9rem", padding: ".5rem 0", borderBottom: "1px solid var(--border)" }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedRemoveIds.has(m.id)}
                                            onChange={() => toggleRemoveId(m.id)}
                                        />
                                        <span style={{ flex: 1 }}>
                                            {m.first_name} {m.last_name}{" "}
                                            <span style={{ color: "var(--text-muted)" }}>({m.email})</span>
                                        </span>
                                        <span style={{ color: "var(--text-muted)" }}>
                                            depuis le {formatDate(m.joined_at)}
                                        </span>
                                        <button
                                            className={styles.btnOutlineSm}
                                            disabled={removing}
                                            onClick={() => handleRemoveOne(m)}
                                        >
                                            Retirer
                                        </button>
                                    </li>
                                ))}
                            </ul>
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

                    {candidates.length > 0 && (
                        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0", display: "flex", flexDirection: "column", gap: ".35rem" }}>
                            {candidates.map((c) => (
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
        </div>
    );
}
