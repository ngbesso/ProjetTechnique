// Libellés de la fiche membre et valeur affichée à défaut. Raison de changer :
// le vocabulaire présenté au membre dans son espace.

const STATUS_LABEL: Record<string, string> = {
  active: "Actif",
  pending: "En attente",
  inactive: "Inactif",
  rejected: "Refusé",
};

/** Un statut inconnu s'affiche tel quel plutôt que de disparaître. */
export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export const DASH = "—";

/** Champ non renseigné : un tiret, une seule fois pour toute la fiche. */
export function orDash(value: string | null | undefined): string {
  return value || DASH;
}

export function initialsOf(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}
