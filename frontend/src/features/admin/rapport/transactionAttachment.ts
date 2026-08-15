// Justificatif attaché à un mouvement financier. Raison de changer : la façon
// de le récupérer et de le nommer.
import { downloadTransactionAttachment } from "../../../lib/api/finances";
import { downloadBlob } from "../../../lib/download";
import type { FinanceTransaction } from "../../../types";

export async function downloadAttachment(tx: FinanceTransaction): Promise<void> {
  if (!tx.attachment_url) return;
  const blob = await downloadTransactionAttachment(tx.attachment_url);
  downloadBlob(blob, `piece-jointe-${tx.type}`);
}
