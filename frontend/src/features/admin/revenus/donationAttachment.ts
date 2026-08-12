// Justificatif d'un revenu. Raison de changer : la façon de récupérer et de
// nommer la pièce jointe.
import { downloadDonationAttachment } from "../../../lib/api/donations";
import { downloadBlob } from "../../../lib/download";
import type { Donation } from "../../../types";

export async function downloadAttachment(donation: Donation): Promise<void> {
  const blob = await downloadDonationAttachment(donation.id);
  downloadBlob(blob, donation.attachment_name ?? `piece-jointe-${donation.id}`);
}
