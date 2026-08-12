// Conversion entre l'événement renvoyé par l'API et le formulaire d'édition.
// Raison de changer : la forme du contrat d'API ou celle du formulaire.
import { toLocalInput } from "../../../lib/format";
import { DEFAULT_CANCEL_DEADLINE_HOURS } from "../../../lib/eventPolicy";
import type { EventInput, EventItem } from "../../../types";

export function eventToForm(e: EventItem): EventInput {
  return {
    title: e.title,
    description: e.description ?? "",
    category: e.category,
    date_start: toLocalInput(e.date_start),
    date_end: toLocalInput(e.date_end),
    location: e.location ?? "",
    instructor: e.instructor ?? "",
    intervenant_category: e.intervenant_category,
    price: e.price ?? 0,
    zeffy_form_path: e.zeffy_form_path ?? "",
    church_id: e.church_id,
    district: e.district,
    capacity: e.capacity,
    show_registration_count: e.show_registration_count,
    status: e.status,
    format: e.format,
    online_link: e.online_link ?? "",
    cancel_deadline_hours: e.cancel_deadline_hours ?? DEFAULT_CANCEL_DEADLINE_HOURS,
    confirmation_message: e.confirmation_message ?? "",
    reminder_message: e.reminder_message ?? "",
    volunteer_capacity: e.volunteer_capacity,
    volunteer_auto_approve: e.volunteer_auto_approve,
    volunteer_message: e.volunteer_message ?? "",
  };
}
