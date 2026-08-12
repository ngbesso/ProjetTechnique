// Portée d'une attribution de rôle. Raison de changer : la règle qui décide de
// l'église retenue lorsque l'administrateur n'en choisit aucune.
import type { Church } from "../../../types";

/** À défaut de choix explicite, l'attribution porte sur l'église mère. */
export function motherChurchId(churches: Church[]): number {
  return churches.find((c) => c.is_mother)?.id ?? churches[0]?.id ?? 0;
}

export function scopedChurchId(churches: Church[], chosenId: string): number {
  return Number(chosenId) || motherChurchId(churches);
}
