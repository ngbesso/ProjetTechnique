import styles from "../AdminPage.module.css";
import { createColumnHelper } from "../../../components/ui/DataTable";
import { formatCurrency } from "../../../lib/format";
import { AttachmentCell } from "./AttachmentCell";
import type { Expense } from "../../../types";

const col = createColumnHelper<Expense>();

interface ExpenseColumnsOptions {
  onUploadAttachment: (expenseId: number, file: File) => Promise<void>;
  onEdit: (expense: Expense) => void;
  onDelete: (id: number, category: string) => void;
}

export function expenseColumns({
  onUploadAttachment,
  onEdit,
  onDelete,
}: ExpenseColumnsOptions) {
  return [
    col.accessor("expense_date", {
      header: "Date",
      cell: (info) => new Date(info.getValue()).toLocaleDateString("fr-CA"),
    }),
    col.accessor("category", { header: "Catégorie" }),
    col.accessor("amount", { header: "Montant", cell: (info) => formatCurrency(info.getValue()) }),
    col.accessor("responsible_email", { header: "Responsable" }),
    col.accessor("comment", { header: "Justification" }),
    col.display({
      id: "attachment",
      header: "Pièce jointe",
      cell: (info) => (
        <AttachmentCell expense={info.row.original} onUpload={onUploadAttachment} />
      ),
    }),
    col.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const e = info.row.original;
        return (
          <div className={styles.actions}>
            <button className={styles.btnOutlineSm} onClick={() => onEdit(e)}>Modifier</button>
            <button className={styles.btnDanger} onClick={() => onDelete(e.id, e.category)}>
              Supprimer
            </button>
          </div>
        );
      },
    }),
  ];
}
