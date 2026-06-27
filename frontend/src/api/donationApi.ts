import { api } from "./client";

// ── Types miroir des schémas backend ──────────────────────────────────────────

export type DonationCategory =
  | "soutien_spirituel"
  | "action_communautaire"
  | "developpement";

export type DonationCurrency = "CAD" | "USD";

export interface DonationCreate {
  amount: number;
  currency: DonationCurrency;
  category: DonationCategory;
  donor_name?: string;
  donor_email?: string;
}

export interface DonationRead {
  id: number;
  receipt_number: string;
  amount: number;
  currency: DonationCurrency;
  category: DonationCategory;
  member_id: number | null;
  donor_name: string | null;
  donor_email: string | null;
  created_at: string;
}

export interface ReceiptRead {
  receipt_number: string;
  amount: number;
  currency: DonationCurrency;
  category: DonationCategory;
  donor_name: string;
  donor_email: string | null;
  created_at: string;
}

// ── Appels API ────────────────────────────────────────────────────────────────

export const donationApi = {
  /** Crée un don (membre connecté ou anonyme). */
  create(payload: DonationCreate): Promise<DonationRead> {
    return api.post("/api/donations/", payload) as Promise<DonationRead>;
  },

  /** Dons du membre connecté (JWT requis). */
  listMine(): Promise<DonationRead[]> {
    return api.get("/api/donations/me") as Promise<DonationRead[]>;
  },

  /** Tous les dons (admin uniquement). */
  listAll(): Promise<DonationRead[]> {
    return api.get("/api/donations/") as Promise<DonationRead[]>;
  },

  /** Détail d'un don. */
  getById(id: number): Promise<DonationRead> {
    return api.get(`/api/donations/${id}`) as Promise<DonationRead>;
  },

  /** Reçu fiscal d'un don. */
  getReceipt(id: number): Promise<ReceiptRead> {
    return api.get(`/api/donations/${id}/recu`) as Promise<ReceiptRead>;
  },
};
