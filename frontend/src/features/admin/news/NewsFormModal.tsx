import styles from "../AdminPage.module.css";
import { FEATURED_HINT, STATUSES, STATUS_LABELS } from "./newsLabels";
import type { NewsInput, NewsStatus } from "../../../types";

interface NewsFormModalProps {
  icon: string;
  title: string;
  subtitle: string;
  /** La modale rend tous les champs de l'actualité : elle les reçoit donc tous. */
  value: NewsInput;
  onChange: (patch: Partial<NewsInput>) => void;
  contentRows: number;
  /** L'ordre parmi les épinglées ne se règle qu'une fois l'actualité créée. */
  showPosition: boolean;
  error: string;
  saving: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: () => void;
  /** Emplacement de la couverture, fourni par l'appelant selon le cas. */
  children?: React.ReactNode;
}

export function NewsFormModal({
  icon,
  title,
  subtitle,
  value,
  onChange,
  contentRows,
  showPosition,
  error,
  saving,
  submitLabel,
  onClose,
  onSubmit,
  children,
}: NewsFormModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "780px" }}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderIcon} aria-hidden>{icon}</div>
          <div className={styles.modalHeaderText}>
            <h2 className={styles.modalName}>{title}</h2>
            <span className={styles.modalSubtitle}>{subtitle}</span>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className={styles.modalForm}>
          <div className={styles.modalBody}>
            <div className={styles.formGrid}>
              <input className={styles.input} placeholder="Titre *" required
                value={value.title} onChange={(e) => onChange({ title: e.target.value })} />
              <input className={styles.input} placeholder="Auteur *" required
                value={value.author} onChange={(e) => onChange({ author: e.target.value })} />
              <input className={styles.input} placeholder="Catégorie (optionnel)"
                value={value.category ?? ""}
                onChange={(e) => onChange({ category: e.target.value })} />
              <select className={styles.select} value={value.status}
                onChange={(e) => onChange({ status: e.target.value as NewsStatus })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <label className={styles.permCheckbox} style={{ gridColumn: "1 / -1" }}>
                <input type="checkbox" checked={value.is_featured ?? false}
                  onChange={(e) => onChange({ is_featured: e.target.checked })} />
                <span>{FEATURED_HINT}</span>
              </label>
              {showPosition && (
                <input className={styles.input} type="number"
                  placeholder="Position (ordre parmi les épinglées)"
                  value={value.position ?? 0}
                  onChange={(e) => onChange({ position: Number(e.target.value) })} />
              )}
              <textarea className={styles.input} placeholder="Résumé / extrait (optionnel)"
                rows={2} value={value.excerpt ?? ""}
                onChange={(e) => onChange({ excerpt: e.target.value })} />
              <textarea className={styles.input} placeholder="Contenu complet *"
                rows={contentRows} required value={value.content}
                onChange={(e) => onChange({ content: e.target.value })}
                style={{ gridColumn: "1 / -1" }} />
              {children}
            </div>
            {error && (
              <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>{error}</p>
            )}
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Enregistrement…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
