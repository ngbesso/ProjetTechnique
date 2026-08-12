// Pièce justificative d'une dépense. Raison de changer : la façon de récupérer
// et de nommer le justificatif.
import { downloadExpenseAttachment } from "../../../lib/api/expenses";
import { downloadBlob } from "../../../lib/download";
import type { Expense } from "../../../types";

export async function downloadAttachment(expense: Expense): Promise<void> {
  const blob = await downloadExpenseAttachment(expense.id);
  downloadBlob(blob, expense.attachment_name ?? `piece-jointe-${expense.id}`);
}
