import { useState } from "react";
import styles from "../AdminPage.module.css";
import { NO_USER_CRITERIA } from "./userFilter";
import type { UserCriteria } from "./userFilter";

interface UserFiltersProps {
  onChange: (criteria: UserCriteria) => void;
}

/** Filtres de la liste ; l'état de saisie ne sort pas d'ici. */
export function UserFilters({ onChange }: UserFiltersProps) {
  const [criteria, setCriteria] = useState<UserCriteria>(NO_USER_CRITERIA);

  function update(patch: Partial<UserCriteria>) {
    const next = { ...criteria, ...patch };
    setCriteria(next);
    onChange(next);
  }

  return (
    <div className={styles.inlineForm} style={{ flexWrap: "wrap", marginBottom: "1rem", gap: "0.5rem" }}>
      <input
        className={styles.input}
        placeholder="Rechercher par courriel…"
        value={criteria.q}
        style={{ flex: "1 1 200px" }}
        onChange={(e) => update({ q: e.target.value })}
      />
      <select
        className={styles.select}
        value={criteria.active}
        onChange={(e) => update({ active: e.target.value })}
      >
        <option value="">Tous les statuts</option>
        <option value="active">Actif</option>
        <option value="inactive">Désactivé</option>
      </select>
    </div>
  );
}
