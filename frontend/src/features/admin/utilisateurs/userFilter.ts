// Filtrage de la liste des comptes, appliqué côté client. Raison de changer :
// les critères de recherche offerts aux administrateurs.
import type { UserAdmin } from "../../../types";

export interface UserCriteria {
  q: string;
  /** "" (tous), "active" ou "inactive". */
  active: string;
}

export const NO_USER_CRITERIA: UserCriteria = { q: "", active: "" };

export function filterUsers(users: UserAdmin[], criteria: UserCriteria): UserAdmin[] {
  return users.filter((u) => {
    if (criteria.q && !u.email.toLowerCase().includes(criteria.q.toLowerCase())) return false;
    if (criteria.active === "active" && !u.is_active) return false;
    if (criteria.active === "inactive" && u.is_active) return false;
    return true;
  });
}
