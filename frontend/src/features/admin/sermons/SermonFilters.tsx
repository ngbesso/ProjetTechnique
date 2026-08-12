import { useState } from "react";
import styles from "../AdminPage.module.css";
import { STATUSES, STATUS_LABELS } from "./sermonLabels";

export interface SermonCriteria {
  q?: string;
  status?: string;
  series?: string;
  format?: string;
}

interface SermonFiltersProps {
  seriesList: string[];
  onChange: (criteria: SermonCriteria) => void;
}

/** Filtres propres au catalogue : série et format s'ajoutent au statut. */
export function SermonFilters({ seriesList, onChange }: SermonFiltersProps) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [series, setSeries] = useState("");
  const [format, setFormat] = useState("");

  // La valeur qui vient de changer est passée explicitement : `setState` n'a
  // pas encore pris effet au moment où la recherche part.
  function apply(overrides: SermonCriteria) {
    const merged = { q, status, series, format, ...overrides };
    onChange({
      q: merged.q?.trim() || undefined,
      status: merged.status || undefined,
      series: merged.series || undefined,
      format: merged.format || undefined,
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
        {STATUSES.map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>
      <select
        className={styles.select}
        value={series}
        onChange={(e) => { setSeries(e.target.value); apply({ series: e.target.value }); }}
      >
        <option value="">Toutes les séries</option>
        {seriesList.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select
        className={styles.select}
        value={format}
        onChange={(e) => { setFormat(e.target.value); apply({ format: e.target.value }); }}
      >
        <option value="">Tous formats</option>
        <option value="audio">Audio</option>
        <option value="video">Vidéo</option>
      </select>
    </div>
  );
}
