import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useExpenses } from "../../hooks/useExpenses";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { DataTable } from "../../components/ui/DataTable";
import { fetchExpenseCategories, uploadExpenseAttachment } from "../../lib/api/expenses";
import { ExpenseFormModal } from "./depenses/ExpenseFormModal";
import { expenseColumns } from "./depenses/expenseColumns";
import { useCreateExpense, useEditExpense } from "./depenses/useExpenseEditor";

const NEW_ATTACHMENT_LABEL = "Pièce jointe (optionnel) — facture, reçu…";

export function DepensesPanel() {
  const { expenses, loading, error, load, add, edit, remove } = useExpenses();
  const { confirm, dialog } = useConfirm();
  const { toast, toasts } = useToast();
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState("");

  function reload() {
    load({ category: filterCategory || undefined });
  }

  const creation = useCreateExpense(add, (category) => {
    reload();
    toast.success(`Dépense « ${category} » enregistrée.`);
  });
  const edition = useEditExpense(edit, (category) => {
    reload();
    toast.success(`Dépense « ${category} » modifiée.`);
  });

  useEffect(() => {
    load();
    fetchExpenseCategories().then(setCategories).catch(() => {});
  }, [load]);

  function applyFilter(category: string) {
    setFilterCategory(category);
    load({ category: category || undefined });
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
    try {
      await uploadExpenseAttachment(expenseId, file);
      reload();
      toast.success("Pièce jointe ajoutée.");
    } catch (err) {
      toast.error(err, "Téléversement impossible.");
    }
  }

  return (
    <div className={styles.rbacWrapper}>
      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          <button type="button" className={styles.btnPrimary} onClick={creation.openModal}>
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
            columns={expenseColumns({
              onUploadAttachment: handleAttachExisting,
              onEdit: edition.open,
              onDelete: handleDelete,
            })}
            data={expenses}
            getRowId={(e) => e.id}
            pageSize={10}
            emptyMessage={loading ? "Chargement…" : "Aucune dépense enregistrée."}
          />
        </div>
      </section>

      {creation.open && (
        <ExpenseFormModal
          icon="💸"
          title="Nouvelle dépense"
          subtitle="Toute dépense doit être justifiée."
          value={creation.form}
          onChange={creation.update}
          categories={categories}
          attachmentLabel={NEW_ATTACHMENT_LABEL}
          onAttachmentChange={creation.setAttachment}
          error={creation.error}
          saving={creation.saving}
          submitLabel="+ Ajouter"
          onClose={creation.close}
          onSubmit={creation.submit}
        />
      )}

      {edition.expense && (
        <ExpenseFormModal
          icon="✏️"
          title="Modifier la dépense"
          value={edition.form}
          onChange={edition.update}
          categories={categories}
          attachmentLabel={
            edition.expense.attachment_url
              ? "Remplacer la pièce jointe (optionnel)"
              : NEW_ATTACHMENT_LABEL
          }
          onAttachmentChange={edition.setAttachment}
          error={edition.error}
          saving={edition.saving}
          submitLabel="Enregistrer"
          onClose={edition.close}
          onSubmit={edition.submit}
        />
      )}

      {dialog}
      {toasts}
    </div>
  );
}
