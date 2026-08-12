import { useState } from "react";
import styles from "../LeadershipPanel.module.css";
import { DISTRICTS } from "../../../types";
import type { LeaderAdminQuery } from "../../../lib/api/leaders";
import type { ParameterValue } from "../../../types";

interface LeaderFiltersProps {
  roleValues: ParameterValue[];
  onChange: (criteria: LeaderAdminQuery) => void;
}

interface RawCriteria {
  q?: string;
  role?: string;
  district?: string;
  is_published?: string;
}

/** Filtres de la liste ; l'état de saisie ne sort pas d'ici. */
export function LeaderFilters({ roleValues, onChange }: LeaderFiltersProps) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [district, setDistrict] = useState("");
  const [published, setPublished] = useState("");

  // La valeur qui vient de changer est passée explicitement : `setState` n'a
  // pas encore pris effet au moment où la recherche part.
  function apply(overrides: RawCriteria) {
    const merged = { q, role, district, is_published: published, ...overrides };
    onChange({
      q: merged.q?.trim() || undefined,
      role: merged.role || undefined,
      district: merged.district || undefined,
      is_published: merged.is_published === "" ? undefined : merged.is_published === "true",
    });
  }

  return (
    <div className={styles.filterRow}>
      <input
        className={styles.filterInput}
        placeholder="Rechercher (nom, titre)…"
        value={q}
        onChange={(e) => { setQ(e.target.value); apply({ q: e.target.value }); }}
      />
      <select
        className={styles.filterSelect}
        value={role}
        onChange={(e) => { setRole(e.target.value); apply({ role: e.target.value }); }}
      >
        <option value="">Tous les rôles</option>
        {roleValues.map((r) => (
          <option key={r.id} value={r.label}>{r.label}</option>
        ))}
      </select>
      <select
        className={styles.filterSelect}
        value={district}
        onChange={(e) => { setDistrict(e.target.value); apply({ district: e.target.value }); }}
      >
        <option value="">Tous les districts</option>
        {DISTRICTS.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <select
        className={styles.filterSelect}
        value={published}
        onChange={(e) => { setPublished(e.target.value); apply({ is_published: e.target.value }); }}
      >
        <option value="">Tous statuts</option>
        <option value="true">Publié</option>
        <option value="false">Brouillon</option>
      </select>
    </div>
  );
}
