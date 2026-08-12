// Libellés et couleurs du suivi des demandes. Raison de changer : le
// vocabulaire du traitement des demandes des membres.
import type { MemberRequestStatus } from "../../../types";

export const STATUS_LABELS: Record<MemberRequestStatus, string> = {
  new: "Nouvelle",
  in_progress: "En cours",
  resolved: "Résolue",
};

export const STATUS_BADGE_CLASS: Record<MemberRequestStatus, string> = {
  new: "badgePending",
  in_progress: "badgeInactive",
  resolved: "badgeActive",
};

export const STATUSES = Object.keys(STATUS_LABELS) as MemberRequestStatus[];
