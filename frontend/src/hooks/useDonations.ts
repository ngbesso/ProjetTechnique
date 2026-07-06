import { useState, useCallback } from "react";
import type { Donation, DonationCreate } from "../types";
import { createDonation, fetchMyDonations } from "../lib/api/donations";

export function useDonations() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDonations(await fetchMyDonations());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  const submit = useCallback(async (data: DonationCreate): Promise<Donation> => {
    const donation = await createDonation(data);
    setDonations((prev) => [donation, ...prev]);
    return donation;
  }, []);

  return { donations, loading, error, load, submit };
}
