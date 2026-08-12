// Valeurs de départ d'une saisie manuelle. Raison de changer : ce qu'on
// propose par défaut au responsable des finances.
import type { DonationManualInput } from "../../../types";

/** Fonction plutôt que constante, pour que la date du jour soit recalculée à
 *  chaque ouverture de la modale. */
export function emptyDonation(): DonationManualInput {
  return {
    amount: 0,
    currency: "CAD",
    contribution_type: "don",
    received_on: new Date().toISOString().slice(0, 10),
  };
}
