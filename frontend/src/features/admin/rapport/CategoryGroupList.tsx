import styles from "../AdminPage.module.css";
import type { CategoryGroup } from "./financeGrouping";

interface CategoryGroupListProps {
  title: string;
  groups: CategoryGroup[];
  emptyMessage: string;
  selectedKey?: string;
  onSelect: (group: CategoryGroup) => void;
}

function rowStyle(selected: boolean) {
  return {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: ".55rem .75rem",
    background: selected ? "var(--primary-50, #ede9fe)" : "var(--neutral-bg)",
    border: selected ? "1px solid var(--primary, #6d28d9)" : "1px solid transparent",
    borderRadius: "var(--radius)",
    cursor: "pointer",
    font: "inherit",
    color: "inherit",
    textAlign: "left" as const,
  };
}

export function CategoryGroupList({
  title,
  groups,
  emptyMessage,
  selectedKey,
  onSelect,
}: CategoryGroupListProps) {
  return (
    <div>
      <h4 style={{ margin: "0 0 .6rem", fontSize: ".9rem", fontWeight: 700 }}>{title}</h4>
      {groups.length === 0 ? (
        <p className={styles.stateMsg}>{emptyMessage}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: ".4rem" }}>
          {groups.map((g) => (
            <li key={g.key}>
              <button type="button" onClick={() => onSelect(g)} style={rowStyle(g.key === selectedKey)}>
                <span>
                  {g.category}{" "}
                  <span style={{ color: "var(--text-muted)", fontSize: ".78rem" }}>({g.count})</span>
                </span>
                <strong>{g.total.toFixed(2)} $ {g.currency}</strong>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
