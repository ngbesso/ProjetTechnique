import type { ReactNode } from "react";
import styles from "./Field.module.css";

interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, error, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {children}
      {error && (
        <span className={styles.errorMsg} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
