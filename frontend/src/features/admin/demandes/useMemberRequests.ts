// Suivi des demandes adressées par les membres. Raison de changer : la façon
// de les consulter et de les filtrer.
import { useCallback, useState } from "react";
import {
  fetchMemberRequestsAdmin,
  fetchMemberRequestsStats,
} from "../../../lib/api/memberRequests";
import type {
  MemberRequestAdmin,
  MemberRequestAdminStats,
  MemberRequestStatus,
} from "../../../types";

export interface MemberRequestCriteria {
  status?: string;
  request_type?: string;
}

export function useMemberRequests() {
  const [requests, setRequests] = useState<MemberRequestAdmin[]>([]);
  const [stats, setStats] = useState<MemberRequestAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [criteria, setCriteria] = useState<MemberRequestCriteria>({});

  // Les critères sont mémorisés pour que `reload` (après enregistrement)
  // conserve le filtre courant.
  const load = useCallback((next: MemberRequestCriteria = {}) => {
    setCriteria(next);
    setLoading(true);
    setError("");
    fetchMemberRequestsAdmin({
      status: (next.status || undefined) as MemberRequestStatus | undefined,
      request_type: next.request_type || undefined,
    })
      .then(setRequests)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
    fetchMemberRequestsStats().then(setStats).catch(() => {});
  }, []);

  return { requests, stats, loading, error, load, reload: () => load(criteria) };
}
