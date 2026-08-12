import styles from "../AdminPage.module.css";
import { STATUSES, STATUS_LABELS } from "./postLabels";
import type { PostInput, PostStatus } from "../../../types";

interface PostFormModalProps {
  icon: string;
  title: string;
  subtitle: string;
  /** La modale rend tous les champs de l'article : elle les reçoit donc tous. */
  value: PostInput;
  onChange: (patch: Partial<PostInput>) => void;
  contentRows: number;
  error: string;
  saving: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: () => void;
  /** Emplacement de la couverture, fourni par l'appelant selon le cas. */
  children?: React.ReactNode;
}

export function PostFormModal({
  icon,
  title,
  subtitle,
  value,
  onChange,
  contentRows,
  error,
  saving,
  submitLabel,
  onClose,
  onSubmit,
  children,
}: PostFormModalProps) {
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

        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
          className={styles.modalForm}
        >
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
                onChange={(e) => onChange({ status: e.target.value as PostStatus })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
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
