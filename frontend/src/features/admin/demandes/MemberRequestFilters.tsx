import { useState } from "react";
import styles from "../AdminPage.module.css";
import { STATUSES, STATUS_LABELS } from "./memberRequestLabels";
import type { MemberRequestCriteria } from "./useMemberRequests";
import type { ParameterValue } from "../../../types";

interface MemberRequestFiltersProps {
  types: ParameterValue[];
  onChange: (criteria: MemberRequestCriteria) => void;
}

/** Filtres de la liste ; l'état de saisie ne sort pas d'ici. */
export function MemberRequestFilters({ types, onChange }: MemberRequestFiltersProps) {
  const [criteria, setCriteria] = useState<MemberRequestCriteria>({});

  function update(patch: MemberRequestCriteria) {
    const next = { ...criteria, ...patch };
    setCriteria(next);
    onChange(next);
  }

  return (
    <div className={styles.filterBar}>
      <select
        className={styles.select}
        value={criteria.status ?? ""}
        onChange={(e) => update({ status: e.target.value })}
      >
        <option value="">Tous statuts</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>
      <select
        className={styles.select}
        value={criteria.request_type ?? ""}
        onChange={(e) => update({ request_type: e.target.value })}
      >
        <option value="">Tous les types</option>
        {types.map((t) => (
          <option key={t.id} value={t.label}>{t.label}</option>
        ))}
      </select>
    </div>
  );
}
