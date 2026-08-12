// Composition d'un ministère : qui en fait partie, qui en sort. Raison de
// changer : la façon dont on consulte et modifie les affiliations.
import { useEffect, useState } from "react";
import {
  fetchMinistryMembers,
  removeMinistryAffiliation,
} from "../../../lib/api/ministryAffiliations";
import type { MinistryMember } from "../../../types";

interface UseMinistryMembersOptions {
  ministry: string;
  /** Doit être stable d'un rendu à l'autre — typiquement un setter `useState`. */
  onError: (message: string) => void;
  onRemoved: (message: string) => void;
  onFailure: (err: unknown, fallback: string) => void;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Erreur";
}

export function useMinistryMembers({
  ministry,
  onError,
  onRemoved,
  onFailure,
}: UseMinistryMembersOptions) {
  const [members, setMembers] = useState<MinistryMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [removing, setRemoving] = useState(false);

  function fetchInto(searchTerm: string) {
    setLoading(true);
    onError("");
    return fetchMinistryMembers(ministry, searchTerm || undefined)
      .then(setMembers)
      .catch((e) => onError(errorMessage(e)))
      .finally(() => setLoading(false));
  }

  // Changer de ministère repart d'une liste vierge, sans recherche ni sélection.
  useEffect(() => {
    if (!ministry) return;
    setSelectedIds(new Set());
    setQuery("");
    setLoading(true);
    onError("");
    fetchMinistryMembers(ministry)
      .then(setMembers)
      .catch((e) => onError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [ministry, onError]);

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function removeMany(targets: MinistryMember[], successMessage: string) {
    setRemoving(true);
    onError("");
    try {
      for (const m of targets) {
        await removeMinistryAffiliation(m.id, m.affiliation_id);
      }
      setSelectedIds(new Set());
      fetchInto(query);
      onRemoved(successMessage);
    } catch (err) {
      onError(errorMessage(err));
      onFailure(err, "Retrait impossible.");
    } finally {
      setRemoving(false);
    }
  }

  return {
    members,
    loading,
    query,
    setQuery,
    reload: () => fetchInto(query),
    selectedIds,
    toggleSelected,
    removing,
    removeMany,
  };
}
