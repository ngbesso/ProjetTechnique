// Conditions qui déterminent l'action proposée au visiteur. Raison de changer :
// les règles d'ouverture de l'inscription (places, paiement, délai).
import { DEFAULT_CANCEL_DEADLINE_HOURS, cancelDeadlineInfo } from "../../../lib/eventPolicy";
import type { CancelDeadlineInfo } from "../../../lib/eventPolicy";
import type { EventItem } from "../../../types";

type ActionFields = Pick<
  EventItem,
  "date_start" | "cancel_deadline_hours" | "capacity" | "spots_left" | "price"
>;

export interface EventActionContext {
  deadline: CancelDeadlineInfo;
  /** Capacité atteinte : l'inscription reste affichée mais inactive. */
  isFull: boolean;
  /** Événement payant dont l'inscription passe encore par le paiement. */
  awaitingPayment: boolean;
}

export function eventActionContext(
  event: ActionFields,
  isConfirmed: boolean,
): EventActionContext {
  return {
    deadline: cancelDeadlineInfo(
      event.date_start,
      event.cancel_deadline_hours ?? DEFAULT_CANCEL_DEADLINE_HOURS,
    ),
    isFull: event.capacity !== null && (event.spots_left ?? 0) <= 0,
    awaitingPayment: !!event.price && event.price > 0 && !isConfirmed,
  };
}
