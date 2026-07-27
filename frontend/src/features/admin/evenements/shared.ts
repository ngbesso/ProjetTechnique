// Constantes et utilitaires partagés entre EvenementsForm, EvenementsList et
// EvenementsPanel (orchestrateur) — évite de dupliquer les libellés et les
// conversions de dates/formulaire entre ces fichiers.
import type { Church, EventFormat, EventInput, EventItem, EventStatus } from "../../../types";

export function churchLabel(churches: Church[], churchId: number | null): string {
  if (churchId === null) return "Toute la mission";
  return churches.find((c) => c.id === churchId)?.name ?? `#${churchId}`;
}

export const DEFAULT_CANCEL_DEADLINE_HOURS = 24;

export const DEFAULT_CONFIRMATION_MESSAGE =
  "Bonjour {prenom}, nous avons bien reçu votre inscription à « {titre} » prévue le {date}. " +
  "Vous pourrez annuler votre inscription jusqu'à {delai} heures avant l'événement.";

export const DEFAULT_REMINDER_MESSAGE =
  "Bonjour {prenom}, petit rappel : « {titre} » a lieu le {date}. Au plaisir de vous y retrouver !";

export const EMPTY: EventInput = {
  title: "",
  description: "",
  category: "",
  date_start: "",
  date_end: "",
  location: "",
  instructor: "",
  price: 0,
  zeffy_form_path: "",
  church_id: null,
  district: null,
  capacity: null,
  show_registration_count: true,
  status: "draft",
  format: "presentiel",
  online_link: "",
  intervenant_category: null,
  cancel_deadline_hours: DEFAULT_CANCEL_DEADLINE_HOURS,
  confirmation_message: DEFAULT_CONFIRMATION_MESSAGE,
  reminder_message: DEFAULT_REMINDER_MESSAGE,
};

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

/** Convertit une valeur <input type="datetime-local"> (heure locale) en ISO UTC pour l'API. */
export function toIso(localValue: string): string | undefined {
  if (!localValue) return undefined;
  return new Date(localValue).toISOString();
}

/** Convertit une date ISO (API) en valeur affichable dans un <input type="datetime-local">. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  };
}

export function formatPrice(price: number | null): string {
  return !price ? "Gratuit" : `${price.toFixed(2)} $`;
}

export function formatLocalDateTime(localValue: string | null | undefined): string {
  if (!localValue) return "—";
  return new Date(localValue).toLocaleString("fr-CA", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Substitue {prenom}/{titre}/{date}/{delai} avec des valeurs d'exemple, pour l'aperçu du message. */
export function renderMessagePreview(template: string, form: EventInput): string {
  const demoDate = form.date_start
    ? new Date(form.date_start).toLocaleDateString("fr-CA", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "15 août 2026";
  const values: Record<string, string> = {
    "{prenom}": "Jean",
    "{titre}": form.title || "Titre de l'événement",
    "{date}": demoDate,
    "{delai}": String(form.cancel_deadline_hours ?? DEFAULT_CANCEL_DEADLINE_HOURS),
  };
  return Object.entries(values).reduce(
    (acc, [token, value]) => acc.split(token).join(value),
    template,
  );
}
