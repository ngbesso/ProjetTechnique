import styles from "../AdminPage.module.css";
import type { Church } from "../../../types";

interface ChurchScopeSelectProps {
  value: string;
  onChange: (churchId: string) => void;
  churches: Church[];
}

/** Choix de l'église sur laquelle porte le rôle ; vide = église mère. */
export function ChurchScopeSelect({ value, onChange, churches }: ChurchScopeSelectProps) {
  return (
    <select className={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Église mère (par défaut)</option>
      {churches.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}{c.is_mother ? " (mère)" : ""}
        </option>
      ))}
    </select>
  );
}
