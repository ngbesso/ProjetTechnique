import { http } from "./client";

/** Comptages publics affichés dans la bande de statistiques de l'accueil. */
export interface PublicStats {
  active_churches: number;
  affiliated_churches: number;
  active_members: number;
}

export function fetchPublicStats(): Promise<PublicStats> {
  return http.get<PublicStats>("/stats/public");
}
