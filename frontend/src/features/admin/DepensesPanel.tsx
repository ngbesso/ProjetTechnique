import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useExpenses } from "../../hooks/useExpenses";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import {
  fetchExpenseCategories,
  uploadExpenseAttachment,
  downloadExpenseAttachment,
} from "../../lib/api/expenses";
import type { Expense, ExpenseInput } from "../../types";

const EMPTY: ExpenseInput = {
  amount: 0,
  expense_date: new Date().toISOString().slice(0, 10),
  category: "",
  comment: "",
};

function formatCad(amount: number): string {
  return amount.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 });
}

async function downloadAttachment(expense: Expense) {
  const blob = await downloadExpenseAttachment(expense.id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = expense.attachment_name ?? `piece-jointe-${expense.id}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const col = createColumnHelper<Expense>();

export function DepensesPanel() {
  const { expenses, loading, error, load, add, edit, remove } = useExpenses();
  const { confirm, dialog } = useConfirm();
  const { toast, toasts } = useToast();
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<ExpenseInput>(EMPTY);
  const [createAttachment, setCreateAttachment] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState<ExpenseInput>(EMPTY);
  const [editAttachment, setEditAttachment] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [uploadingId, setUploadingId] = useState<number | null>(null);

  useEffect(() => {
    load();
    fetchExpenseCategories().then(setCategories).catch(() => {});
  }, [load]);

  function applyFilter(category: string) {
    setFilterCategory(category);
    load({ category: category || undefined });
  }

  function openCreateModal() {
    setForm(EMPTY);
    setCreateAttachment(null);
    setFormError("");
    setShowCreateModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category || !form.comment.trim() || form.amount <= 0) {
      setFormError("Montant, catégorie et commentaire (justification) sont requis.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const created = await add(form);
      if (createAttachment) {
        await uploadExpenseAttachment(created.id, createAttachment);
      }
      setShowCreateModal(false);
      load({ category: filterCategory || undefined });
      toast.success(`Dépense « ${created.category} » enregistrée.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(exp: Expense) {
    setEditingExpense(exp);
    setEditForm({
      amount: exp.amount,
      expense_date: exp.expense_date,
      category: exp.category,
      comment: exp.comment,
    });
    setEditAttachment(null);
    setEditError("");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingExpense) return;
    if (!editForm.category || !editForm.comment.trim() || editForm.amount <= 0) {
      setEditError("Montant, catégorie et commentaire (justification) sont requis.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      await edit(editingExpense.id, editForm);
      if (editAttachment) {
        await uploadExpenseAttachment(editingExpense.id, editAttachment);
      }
      setEditingExpense(null);
      load({ category: filterCategory || undefined });
      toast.success(`Dépense « ${editForm.category} » modifiée.`);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: number, category: string) {
    const ok = await confirm({
      title: `Supprimer la dépense « ${category} » ?`,
      description: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await remove(id);
      toast.success(`Dépense « ${category} » supprimée.`);
    } catch (err) {
      toast.error(err, "Suppression impossible.");
    }
  }

  async function handleAttachExisting(expenseId: number, file: File) {
    setUploadingId(expenseId);
    try {
      await uploadExpenseAttachment(expenseId, file);
      load({ category: filterCategory || undefined });
      toast.success("Pièce jointe ajoutée.");
    } catch (err) {
      toast.error(err, "Téléversement impossible.");
    } finally {
      setUploadingId(null);
    }
  }

  const columns = [
    col.accessor("expense_date", { header: "Date", cell: (info) => new Date(info.getValue()).toLocaleDateString("fr-CA") }),
    col.accessor("category", { header: "Catégorie" }),
    col.accessor("amount", { header: "Montant", cell: (info) => formatCad(info.getValue()) }),
    col.accessor("responsible_email", { header: "Responsable" }),
    col.accessor("comment", { header: "Justification" }),
    col.display({
      id: "attachment",
      header: "Pièce jointe",
      cell: (info) => {
        const e = info.row.original;
        if (e.attachment_url) {
          return (
            <button type="button" className={styles.btnOutlineSm} onClick={() => downloadAttachment(e)}>
              📎 {e.attachment_name ?? "Télécharger"}
            </button>
          );
        }
        return (
          <button
            type="button"
            className={styles.btnOutlineSm}
            disabled={uploadingId === e.id}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.onchange = () => {
                const file = input.files?.[0];
                if (file) handleAttachExisting(e.id, file);
              };
              input.click();
            }}
          >
            {uploadingId === e.id ? "…" : "+ Ajouter"}
          </button>
        );
      },
    }),
    col.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const e = info.row.original;
        return (
          <div className={styles.actions}>
            <button className={styles.btnOutlineSm} onClick={() => openEdit(e)}>Modifier</button>
            <button className={styles.btnDanger} onClick={() => handleDelete(e.id, e.category)}>Supprimer</button>
          </div>
        );
      },
    }),
  ];

  return (
    <div className={styles.rbacWrapper}>
      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          <button type="button" className={styles.btnPrimary} onClick={openCreateModal}>
            + Nouvelle dépense
          </button>
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>Dépenses ({expenses.length})</h3>
        </div>

        <div className={styles.filterBar}>
          <select className={styles.select} value={filterCategory} onChange={(e) => applyFilter(e.target.value)}>
            <option value="">Toutes catégories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {error && <p className={styles.errorMsg} role="alert">{error}</p>}

        <div className={styles.listBody}>
          <DataTable
            columns={columns}
            data={expenses}
            getRowId={(e) => e.id}
            pageSize={10}
            emptyMessage={loading ? "Chargement…" : "Aucune dépense enregistrée."}
          />
        </div>
      </section>

      {/* ── Modale création ── */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderIcon}>💸</div>
              <div className={styles.modalHeaderText}>
                <h2 className={styles.modalName}>Nouvelle dépense</h2>
                <span className={styles.modalSubtitle}>Toute dépense doit être justifiée.</span>
              </div>
              <button className={styles.modalClose} onClick={() => setShowCreateModal(false)} aria-label="Fermer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <input className={styles.input} type="number" step="0.01" min="0.01" placeholder="Montant *" required
                    value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
                  <input className={styles.input} type="date" required
                    value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
                  <select className={styles.select} required value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">Catégorie *</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <textarea className={styles.input} placeholder="Justification de la dépense *" required
                    rows={3} value={form.comment}
                    onChange={(e) => setForm({ ...form, comment: e.target.value })}
                    style={{ gridColumn: "1 / -1" }} />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--text-muted)" }}>
                      Pièce jointe (optionnel) — facture, reçu…
                    </label>
                    <input type="file" onChange={(e) => setCreateAttachment(e.target.files?.[0] ?? null)} />
                  </div>
                </div>
                {formError && <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>{formError}</p>}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setShowCreateModal(false)} disabled={saving}>
                  Annuler
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? "Enregistrement…" : "+ Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale édition ── */}
      {editingExpense && (
        <div className={styles.modalOverlay} onClick={() => setEditingExpense(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderIcon}>✏️</div>
              <div className={styles.modalHeaderText}>
                <h2 className={styles.modalName}>Modifier la dépense</h2>
              </div>
              <button className={styles.modalClose} onClick={() => setEditingExpense(null)} aria-label="Fermer">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className={styles.modalForm}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <input className={styles.input} type="number" step="0.01" min="0.01" placeholder="Montant *" required
                    value={editForm.amount || ""} onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })} />
                  <input className={styles.input} type="date" required
                    value={editForm.expense_date} onChange={(e) => setEditForm({ ...editForm, expense_date: e.target.value })} />
                  <select className={styles.select} required value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                    <option value="">Catégorie *</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <textarea className={styles.input} placeholder="Justification de la dépense *" required
                    rows={3} value={editForm.comment}
                    onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                    style={{ gridColumn: "1 / -1" }} />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--text-muted)" }}>
                      {editingExpense.attachment_url ? "Remplacer la pièce jointe (optionnel)" : "Pièce jointe (optionnel) — facture, reçu…"}
                    </label>
                    <input type="file" onChange={(e) => setEditAttachment(e.target.files?.[0] ?? null)} />
                  </div>
                </div>
                {editError && <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>{editError}</p>}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setEditingExpense(null)} disabled={editSaving}>
                  Annuler
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={editSaving}>
                  {editSaving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dialog}
      {toasts}
    </div>
  );
}
