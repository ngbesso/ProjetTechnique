import { useState } from "react";
import styles from "../AdminPage.module.css";

interface SearchPickerProps<T> {
  placeholder: string;
  search: (query: string) => Promise<T[]>;
  keyOf: (item: T) => number;
  renderLabel: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
  /** Bloc facultatif sous les résultats — création à la volée, par exemple. */
  renderFooter?: (query: string, busy: boolean) => React.ReactNode;
}

/** Champ de recherche et liste de résultats cliquables. La saisie et les
 *  résultats restent ici : seul l'élément retenu remonte. */
export function SearchPicker<T>({
  placeholder,
  search,
  keyOf,
  renderLabel,
  onSelect,
  renderFooter,
}: SearchPickerProps<T>) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [searching, setSearching] = useState(false);

  function run() {
    setSearching(true);
    search(query)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }

  return (
    <>
      <div className={styles.inlineForm} style={{ gap: "0.4rem" }}>
        <input
          className={styles.input}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); run(); } }}
        />
        <button type="button" className={styles.btnOutlineSm} disabled={searching} onClick={run}>
          {searching ? "…" : "Rechercher"}
        </button>
      </div>
      {results.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0", display: "flex", flexDirection: "column", gap: "0.25rem", maxHeight: "160px", overflowY: "auto" }}>
          {results.map((item) => (
            <li key={keyOf(item)}>
              <button
                type="button"
                className={styles.btnOutlineSm}
                style={{ width: "100%", textAlign: "left" }}
                onClick={() => { onSelect(item); setResults([]); }}
              >
                {renderLabel(item)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {renderFooter?.(query, searching)}
    </>
  );
}
