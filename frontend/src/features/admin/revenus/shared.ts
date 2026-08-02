// Constantes et utilitaires partagés entre RevenusStats, RevenusList,
// RevenuCreateModal et RevenusPanel (orchestrateur) — évite de dupliquer les
// libellés et le téléchargement de pièce jointe entre ces fichiers.
import { downloadDonationAttachment } from "../../../lib/api/donations";
import type { Donation, DonationManualInput } from "../../../types";

export const CATEGORY_LABELS: Record<string, string> = {
  soutien_spirituel: "Soutien spirituel",
  action_communautaire: "Action communautaire",
  developpement: "Développement",
};

export const CONTRIBUTION_LABELS: Record<string, string> = {
  don: "Don",
  dime: "Dîme",
  offrande: "Offrande",
};

export const STATUS_LABELS: Record<string, string> = {
  manual: "Manuel",
  succeeded: "Réussi",
  pending: "En attente",
  failed: "Échoué",
};

/** Filtres de la liste des revenus, tels qu'attendus par `fetchAllDonations`. */
export interface DonationFilters {
  q?: string;
  payment_status?: string;
  category?: string;
  currency?: string;
}

/** Formulaire vierge de saisie manuelle. Fonction plutôt que constante, pour
 *  que la date du jour soit recalculée à chaque ouverture de la modale. */
export function emptyDonation(): DonationManualInput {
  return {
    amount: 0,
    currency: "CAD",
    contribution_type: "don",
    received_on: new Date().toISOString().slice(0, 10),
  };
}

export async function downloadAttachment(donation: Donation) {
  const blob = await downloadDonationAttachment(donation.id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = donation.attachment_name ?? `piece-jointe-${donation.id}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
