import { useState } from "react";
import styles from "../EglisesPanel.module.css";
import { NO_CRITERIA } from "./churchFilter";
import type { ChurchCriteria } from "./churchFilter";
import type { ParameterValue } from "../../../types";

interface ChurchFiltersProps {
  districtValues: ParameterValue[];
  onChange: (criteria: ChurchCriteria) => void;
}

/** Filtres de la liste ; l'état de saisie ne sort pas d'ici. */
export function ChurchFilters({ districtValues, onChange }: ChurchFiltersProps) {
  const [criteria, setCriteria] = useState<ChurchCriteria>(NO_CRITERIA);

  function update(patch: Partial<ChurchCriteria>) {
    const next = { ...criteria, ...patch };
    setCriteria(next);
    onChange(next);
  }

  return (
    <div className={styles.filterRow}>
      <input
        className={styles.filterInput}
        placeholder="Rechercher (nom, pasteur, adresse)…"
        value={criteria.q}
        onChange={(e) => update({ q: e.target.value })}
      />
      <select
        className={styles.filterSelect}
        value={criteria.district}
        onChange={(e) => update({ district: e.target.value })}
      >
        <option value="">Tous les districts</option>
        {districtValues.map((d) => <option key={d.id} value={d.label}>{d.label}</option>)}
      </select>
      <select
        className={styles.filterSelect}
        value={criteria.type}
        onChange={(e) => update({ type: e.target.value })}
      >
        <option value="">Tous les types</option>
        <option value="mere">Mère</option>
        <option value="affiliee">Affiliée</option>
      </select>
    </div>
  );
}
