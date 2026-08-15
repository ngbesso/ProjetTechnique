// Politique d'annulation d'une inscription à un événement. Raison de changer :
// la règle que l'organisation applique aux désistements.
//
// Vit dans lib/ parce que l'administration et les pages publiques en dépendent
// toutes deux : un panneau ne doit pas importer depuis le dossier d'un autre.

export const DEFAULT_CANCEL_DEADLINE_HOURS = 24;

export interface CancelDeadlineInfo {
  passed: boolean;
  label: string;
}

/** Formule le temps restant en jours dès 24 h, en heures en deçà. */
function remainingLabel(hoursRemaining: number): string {
  if (hoursRemaining >= 48) return `${Math.floor(hoursRemaining / 24)} jours`;
  if (hoursRemaining >= 24) return "1 jour";
  return `${hoursRemaining} h`;
}

export function cancelDeadlineInfo(dateStart: string, deadlineHours: number): CancelDeadlineInfo {
  const deadline = new Date(dateStart).getTime() - deadlineHours * 3_600_000;
  const now = Date.now();
  if (now >= deadline) {
    return {
      passed: true,
      label: `Le délai pour annuler votre inscription est dépassé (annulation possible jusqu'à ${deadlineHours} h avant l'événement).`,
    };
  }
  const hoursRemaining = Math.max(Math.floor((deadline - now) / 3_600_000), 1);
  return {
    passed: false,
    label: `Vous pouvez encore annuler votre inscription (encore ${remainingLabel(hoursRemaining)}, jusqu'à ${deadlineHours} h avant l'événement).`,
  };
}
