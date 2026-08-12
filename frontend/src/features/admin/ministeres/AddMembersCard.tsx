import { useState } from "react";
import styles from "../AdminPage.module.css";
import { fetchMembers } from "../../../lib/api/members";
import { bulkAddMinistryMembers } from "../../../lib/api/ministryAffiliations";
import type { Member } from "../../../types";

interface AddMembersCardProps {
  ministry: string;
  /** Sexe auquel le ministère est réservé, `null` s'il est ouvert à tous. */
  restriction: string | null;
  /** Membres déjà affiliés : proposés mais non sélectionnables. */
  currentIds: Set<number>;
  onAdded: (addedCount: number) => void;
  onError: (message: string) => void;
}

export function AddMembersCard({
  ministry,
  restriction,
  currentIds,
  onAdded,
  onError,
}: AddMembersCardProps) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState("");

  const eligible = candidates.filter((c) => !restriction || c.sexe === restriction);

  function search(e?: React.FormEvent) {
    e?.preventDefault();
    setSearching(true);
    fetchMembers({ q: query || undefined, status: "active", limit: 20 })
      .then((res) => setCandidates(res.items))
      .catch(() => setCandidates([]))
      .finally(() => setSearching(false));
  }

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkAdd() {
    if (!ministry || selectedIds.size === 0) return;
    setAdding(true);
    onError("");
    setResult("");
    try {
      const outcome = await bulkAddMinistryMembers(ministry, [...selectedIds]);
      setResult(
        `${outcome.added.length} membre(s) ajouté(s)` +
        (outcome.skipped.length
          ? `, ${outcome.skipped.length} déjà affilié(s) ou hors périmètre.`
          : "."),
      );
      setSelectedIds(new Set());
      setCandidates([]);
      setQuery("");
      onAdded(outcome.added.length);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Ajouter des membres à « {ministry} »</h3>
      <form onSubmit={search} className={styles.toolbar}>
        <input
          className={styles.input}
          placeholder="Rechercher un membre (nom, courriel)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className={styles.btnOutlineSm} disabled={searching}>
          {searching ? "…" : "Rechercher"}
        </button>
      </form>

      {restriction && (
        <p style={{ fontSize: ".8rem", color: "var(--text-muted)", margin: ".5rem 0 0" }}>
          Ce ministère est réservé aux membres de sexe « {restriction} ».
        </p>
      )}

      {eligible.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0", display: "flex", flexDirection: "column", gap: ".35rem" }}>
          {eligible.map((c) => (
            <li key={c.id} style={{ display: "flex", alignItems: "center", gap: ".75rem", fontSize: ".9rem" }}>
              <input
                type="checkbox"
                disabled={currentIds.has(c.id)}
                checked={selectedIds.has(c.id)}
                onChange={() => toggle(c.id)}
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

      {selectedIds.size > 0 && (
        <button className={styles.btnPrimary} disabled={adding} onClick={handleBulkAdd}>
          {adding ? "…" : `Ajouter la sélection (${selectedIds.size})`}
        </button>
      )}
      {result && (
        <p style={{ color: "var(--vivid-violet)", fontSize: ".85rem", marginTop: ".5rem" }}>
          {result}
        </p>
      )}
    </section>
  );
}
