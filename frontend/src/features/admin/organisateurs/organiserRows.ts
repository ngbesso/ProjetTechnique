// Lecture de la liste des organisateurs. Raison de changer : la façon dont le
// rôle et ses portées se traduisent en lignes de tableau.
import type { AssignmentRead, OrganiserEventCount, UserAdmin } from "../../../types";

export const ROLE_NAME = "organisateur";

/** Utilisateur doté du rôle organisateur, enrichi de l'attribution concernée
 *  et du nombre d'événements qu'il a créés. */
export interface OrganiserRow extends UserAdmin {
  assignment: AssignmentRead;
  event_count: number;
}

/**
 * Un même compte peut porter le rôle sur plusieurs églises : une ligne par
 * attribution, pour que le retrait cible la bonne portée.
 */
export function toOrganiserRows(
  users: UserAdmin[],
  eventCounts: OrganiserEventCount[],
): OrganiserRow[] {
  const countByUser = new Map(eventCounts.map((c) => [c.user_id, c.event_count]));
  return users.flatMap((u) =>
    u.assignments
      .filter((a) => a.role === ROLE_NAME)
      .map((assignment) => ({
        ...u,
        assignment,
        event_count: countByUser.get(u.id) ?? 0,
      })),
  );
}

export interface OrganiserStats {
  total: number;
  active: number;
  inactive: number;
  totalEvents: number;
}

/** Les compteurs portent sur les comptes, pas sur les attributions. */
export function organiserStats(rows: OrganiserRow[]): OrganiserStats {
  const uniqueIds = new Set(rows.map((o) => o.id));
  const active = new Set(rows.filter((o) => o.is_active).map((o) => o.id)).size;
  const eventsById = new Map(rows.map((o) => [o.id, o.event_count]));
  const totalEvents = [...uniqueIds].reduce((sum, id) => sum + (eventsById.get(id) ?? 0), 0);
  return {
    total: uniqueIds.size,
    active,
    inactive: uniqueIds.size - active,
    totalEvents,
  };
}

/** Comptes ne portant pas encore le rôle — candidats à l'attribution. */
export function candidateAccounts(users: UserAdmin[]): UserAdmin[] {
  return users.filter((u) => !u.assignments.some((a) => a.role === ROLE_NAME));
}
