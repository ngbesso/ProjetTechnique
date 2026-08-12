import styles from "../EvenementsPanel.module.css";
import { STEPS } from "./eventFormSteps";

/** Fil d'Ariane des étapes de l'assistant. */
export function EventStepProgress({ current }: { current: number }) {
  return (
    <div className={styles.stepProgress}>
      {STEPS.map((s, i) => (
        <div key={s.id} className={styles.stepItem}>
          <div className={styles.stepDotCol}>
            <div
              className={`${styles.stepDot} ${i === current ? styles.stepDotActive : ""} ${i < current ? styles.stepDotDone : ""}`}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span className={i === current ? `${styles.stepLabel} ${styles.stepLabelActive}` : styles.stepLabel}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`${styles.stepLine} ${i < current ? styles.stepLineDone : ""}`} />
          )}
        </div>
      ))}
    </div>
  );
}
