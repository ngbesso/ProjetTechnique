import { useState } from "react";
import styles from "../EvenementsPanel.module.css";
import type { EventAdminQuery } from "../../../lib/api/events";
import type { ParameterValue } from "../../../types";

interface EventListFiltersProps {
  categoryValues: ParameterValue[];
  districtValues: ParameterValue[];
  onChange: (criteria: EventAdminQuery) => void;
}

interface RawCriteria {
  q: string;
  category: string;
  district: string;
}

const EMPTY: RawCriteria = { q: "", category: "", district: "" };

/** Filtres de la liste ; l'état de saisie ne sort pas d'ici. */
export function EventListFilters({
  categoryValues,
  districtValues,
  onChange,
}: EventListFiltersProps) {
  const [criteria, setCriteria] = useState<RawCriteria>(EMPTY);

  function update(patch: Partial<RawCriteria>) {
    const next = { ...criteria, ...patch };
    setCriteria(next);
    onChange({
      q: next.q.trim() || undefined,
      category: next.category || undefined,
      district: next.district || undefined,
    });
  }

  return (
    <div className={styles.filterRow}>
      <input
        className={styles.filterInput}
        placeholder="Rechercher (titre, lieu)…"
        value={criteria.q}
        onChange={(e) => update({ q: e.target.value })}
      />
      <select
        className={styles.filterSelect}
        value={criteria.category}
        onChange={(e) => update({ category: e.target.value })}
      >
        <option value="">Toutes catégories</option>
        {categoryValues.map((c) => (
          <option key={c.id} value={c.label}>{c.label}</option>
        ))}
      </select>
      <select
        className={styles.filterSelect}
        value={criteria.district}
        onChange={(e) => update({ district: e.target.value })}
      >
        <option value="">Tous les districts</option>
        {districtValues.map((d) => (
          <option key={d.id} value={d.label}>{d.label}</option>
        ))}
      </select>
    </div>
  );
}
