import { useCallback, useState } from "react";

// Squelette loading/error/try-catch-finally commun à tous les hooks de liste
// (useMembers, useLeaders, useSermons, useNews, usePosts, useChurches...) :
// chaque hook ne garde que ses propres appels API et son propre state de données.
export function useAsyncList() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, run };
}
