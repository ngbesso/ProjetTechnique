import styles from "./Toast.module.css";

export type ToastVariant = "success" | "error";

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

/**
 * Pile de notifications éphémères. Rendue par useToast — les panneaux ne
 * l'instancient pas directement.
 */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;
  return (
    <div className={styles.viewport}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${styles.toast} ${t.variant === "error" ? styles.toastError : styles.toastSuccess}`}
          // Une erreur interrompt la lecture d'écran, une confirmation attend
          // une pause naturelle.
          role={t.variant === "error" ? "alert" : "status"}
          aria-live={t.variant === "error" ? "assertive" : "polite"}
        >
          <span className={styles.icon} aria-hidden>
            {t.variant === "error" ? "⚠" : "✓"}
          </span>
          <span className={styles.message}>{t.message}</span>
          <button
            type="button"
            className={styles.close}
            aria-label="Fermer la notification"
            onClick={() => onDismiss(t.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
