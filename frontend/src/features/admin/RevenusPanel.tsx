import { useCallback, useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { fetchAllDonations, fetchDonationsStats, uploadDonationAttachment } from "../../lib/api/donations";
import { useChurches } from "../../hooks/useChurches";
import { useToast } from "../../hooks/useToast";
import { RevenuCreateModal } from "./revenus/RevenuCreateModal";
import { RevenusList } from "./revenus/RevenusList";
import { RevenusStats } from "./revenus/RevenusStats";
import type { DonationFilters } from "./revenus/shared";
import type { Donation, DonationAdminStats } from "../../types";

/** Orchestrateur de l'onglet Revenus : charge dons et statistiques, puis
 *  délègue l'affichage à RevenusStats / RevenusList / RevenuCreateModal. */
export function RevenusPanel() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<DonationAdminStats | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const { churches, load: loadChurches } = useChurches();
  const { toast, toasts } = useToast();

  const loadStats = useCallback(() => {
    fetchDonationsStats().then(setStats).catch(() => {});
  }, []);

  // `loading` ne couvre que le premier chargement : les rechargements dus aux
  // filtres rafraîchissent le tableau sur place, sans démonter la barre de
  // recherche (qui perdrait le focus et l'état des filtres à chaque frappe).
  const loadDonations = useCallback((filters: DonationFilters = {}) => {
    setError("");
    fetchAllDonations({
      q: filters.q?.trim() || undefined,
      payment_status: filters.payment_status || undefined,
      category: filters.category || undefined,
      currency: filters.currency || undefined,
    })
      .then(setDonations)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStats();
    loadDonations();
    loadChurches({ activeOnly: true });
  }, [loadStats, loadDonations, loadChurches]);

  /** Ajout d'une pièce jointe sur un don déjà enregistré. */
  const handleAttach = useCallback(
    async (donationId: number, file: File) => {
      setUploadingId(donationId);
      try {
        const updated = await uploadDonationAttachment(donationId, file);
        setDonations((prev) => prev.map((d) => (d.id === donationId ? updated : d)));
        toast.success("Pièce jointe ajoutée.");
      } catch (err) {
        toast.error(err, "Téléversement impossible.");
      } finally {
        setUploadingId(null);
      }
    },
    [toast],
  );

  if (loading) return <p className={styles.stateMsg}>Chargement…</p>;

  return (
    <div className={styles.rbacWrapper}>
      {error && (
        <p className={styles.errorMsg} role="alert">
          {error}
        </p>
      )}

      {stats && <RevenusStats stats={stats} />}

      <RevenusList
        donations={donations}
        uploadingId={uploadingId}
        onFiltersChange={loadDonations}
        onCreate={() => setShowCreateModal(true)}
        onAttach={handleAttach}
      />

      {showCreateModal && (
        <RevenuCreateModal
          churches={churches}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            loadDonations();
            loadStats();
            toast.success("Revenu enregistré.");
          }}
        />
      )}
      {toasts}
    </div>
  );
}
