import styles from "../AdminPage.module.css";
import type { ExpenseInput } from "../../../types";

interface ExpenseFormModalProps {
  icon: string;
  title: string;
  /** Absent à la modification : l'intitulé se suffit à lui-même. */
  subtitle?: string;
  /** La modale rend toute la dépense : elle en reçoit donc tous les champs. */
  value: ExpenseInput;
  onChange: (patch: Partial<ExpenseInput>) => void;
  categories: string[];
  attachmentLabel: string;
  onAttachmentChange: (file: File | null) => void;
  error: string;
  saving: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: () => void;
}

export function ExpenseFormModal({
  icon,
  title,
  subtitle,
  value,
  onChange,
  categories,
  attachmentLabel,
  onAttachmentChange,
  error,
  saving,
  submitLabel,
  onClose,
  onSubmit,
}: ExpenseFormModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderIcon} aria-hidden>{icon}</div>
          <div className={styles.modalHeaderText}>
            <h2 className={styles.modalName}>{title}</h2>
            {subtitle && <span className={styles.modalSubtitle}>{subtitle}</span>}
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className={styles.modalForm}>
          <div className={styles.modalBody}>
            <div className={styles.formGrid}>
              <input className={styles.input} type="number" step="0.01" min="0.01"
                placeholder="Montant *" required
                value={value.amount || ""}
                onChange={(e) => onChange({ amount: Number(e.target.value) })} />
              <input className={styles.input} type="date" required
                value={value.expense_date}
                onChange={(e) => onChange({ expense_date: e.target.value })} />
              <select className={styles.select} required value={value.category}
                onChange={(e) => onChange({ category: e.target.value })}>
                <option value="">Catégorie *</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <textarea className={styles.input} placeholder="Justification de la dépense *" required
                rows={3} value={value.comment}
                onChange={(e) => onChange({ comment: e.target.value })}
                style={{ gridColumn: "1 / -1" }} />
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--text-muted)" }}>
                  {attachmentLabel}
                </label>
                <input type="file" onChange={(e) => onAttachmentChange(e.target.files?.[0] ?? null)} />
              </div>
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
