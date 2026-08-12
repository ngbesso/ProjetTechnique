// Critères de recherche de la liste des revenus. Raison de changer : ce que
// `fetchAllDonations` accepte de filtrer.

export interface DonationFilters {
  q?: string;
  payment_status?: string;
  category?: string;
  currency?: string;
}
