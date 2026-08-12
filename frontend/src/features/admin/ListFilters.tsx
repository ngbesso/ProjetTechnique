import { useState } from "react";
import styles from "./AdminPage.module.css";

export interface ListCriteria {
  q?: string;
  status?: string;
  category?: string;
}

interface ListFiltersProps {
  statuses: { value: string; label: string }[];
  categories: string[];
  onChange: (criteria: ListCriteria) => void;
}

/**
 * Barre de filtres commune aux listes d'administration. Placée au niveau du
 * dossier admin plutôt que dans l'un des panneaux : aucun panneau ne dépend
 * ainsi du dossier d'un autre.
 */
export function ListFilters({ statuses, categories, onChange }: ListFiltersProps) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  // La valeur qui vient de changer est passée explicitement : `setState` n'a
  // pas encore pris effet au moment où la recherche part.
  function apply(overrides: ListCriteria) {
    const merged = { q, status, category, ...overrides };
    onChange({
      q: merged.q?.trim() || undefined,
      status: merged.status || undefined,
      category: merged.category || undefined,
    });
  }

  return (
    <div className={styles.filterBar}>
      <input
        className={styles.input}
        placeholder="Rechercher…"
        value={q}
        style={{ flex: "1 1 160px" }}
        onChange={(e) => { setQ(e.target.value); apply({ q: e.target.value }); }}
      />
      <select
        className={styles.select}
        value={status}
        onChange={(e) => { setStatus(e.target.value); apply({ status: e.target.value }); }}
      >
        <option value="">Tous statuts</option>
        {statuses.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <select
        className={styles.select}
        value={category}
        onChange={(e) => { setCategory(e.target.value); apply({ category: e.target.value }); }}
      >
        <option value="">Toutes catégories</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}
