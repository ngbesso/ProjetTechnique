// Libellés affichés d'un événement. Raison de changer : le vocabulaire montré
// à l'utilisateur (formats, statuts, prix, rattachement à une église).
import { formatCurrency } from "../../../lib/format";
import type { Church, EventFormat, EventStatus } from "../../../types";

export const FORMAT_LABELS: Record<EventFormat, string> = {
  presentiel: "Présentiel",
  en_ligne: "En ligne",
  hybride: "Hybride",
};

export const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  cancelled: "Annulé",
  completed: "Terminé",
};

export function churchLabel(churches: Church[], churchId: number | null): string {
  if (churchId === null) return "Toute la mission";
  return churches.find((c) => c.id === churchId)?.name ?? `#${churchId}`;
}

/** Classe du badge de statut dans la liste — la couleur porte le sens. */
export const STATUS_BADGE_CLASS: Record<EventStatus, string> = {
  draft: "badgeDraft",
  published: "badgePublished",
  cancelled: "badgeCancelled",
  completed: "badgeCompleted",
};

/** Un événement sans prix est gratuit — c'est la règle métier ; le formatage du
 *  montant lui-même vient de lib/format. */
export function eventPriceLabel(price: number | null): string {
  return price ? formatCurrency(price) : "Gratuit";
}
