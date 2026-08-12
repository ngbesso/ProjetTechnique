// Filtrage de la liste des églises, appliqué côté client. Raison de changer :
// les critères de recherche offerts aux administrateurs.
import type { Church } from "../../../types";

export interface ChurchCriteria {
  q: string;
  district: string;
  /** "" (tous), "mere" ou "affiliee". */
  type: string;
}

export const NO_CRITERIA: ChurchCriteria = { q: "", district: "", type: "" };

function matchesTerm(c: Church, term: string): boolean {
  return (
    c.name.toLowerCase().includes(term) ||
    (c.pastor_name ?? "").toLowerCase().includes(term) ||
    (c.address ?? "").toLowerCase().includes(term)
  );
}

export function filterChurches(churches: Church[], criteria: ChurchCriteria): Church[] {
  return churches.filter((c) => {
    if (criteria.q && !matchesTerm(c, criteria.q.toLowerCase())) return false;
    if (criteria.district && c.district !== criteria.district) return false;
    if (criteria.type === "mere" && !c.is_mother) return false;
    if (criteria.type === "affiliee" && c.is_mother) return false;
    return true;
  });
}
