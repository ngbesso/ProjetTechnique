// Valeurs par défaut d'un événement. Raison de changer : la politique par
// défaut de l'organisation (délai d'annulation, textes des messages envoyés).
import { DEFAULT_CANCEL_DEADLINE_HOURS } from "../../../lib/eventPolicy";
import type { District, EventFormat, EventInput, EventStatus } from "../../../types";

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
  volunteer_capacity: null,
  volunteer_auto_approve: false,
  volunteer_message: "",
};

/**
 * Événement dont tous les champs facultatifs sont résolus. Les `null` qui
 * subsistent portent un sens métier — pas d'église organisatrice, capacité
 * illimitée — et ne sont donc pas remplacés.
 */
export interface EventFormValues {
  title: string;
  description: string;
  category: string;
  date_start: string;
  date_end: string;
  location: string;
  instructor: string;
  intervenant_category: string | null;
  price: number;
  zeffy_form_path: string;
  church_id: number | null;
  district: District | null;
  capacity: number | null;
  show_registration_count: boolean;
  status: EventStatus;
  format: EventFormat;
  online_link: string;
  cancel_deadline_hours: number;
  confirmation_message: string;
  reminder_message: string;
  volunteer_capacity: number | null;
  volunteer_auto_approve: boolean;
  volunteer_message: string;
}

/**
 * Valeur de repli de chaque champ pour l'affichage du formulaire. Distincte de
 * `EMPTY` : les messages y sont vides, car les textes par défaut ne servent que
 * de « placeholder » tant que l'organisateur n'a rien saisi.
 */
const FALLBACK_VALUES: EventFormValues = {
  title: "",
  description: "",
  category: "",
  date_start: "",
  date_end: "",
  location: "",
  instructor: "",
  intervenant_category: null,
  price: 0,
  zeffy_form_path: "",
  church_id: null,
  district: null,
  capacity: null,
  show_registration_count: true,
  status: "draft",
  format: "presentiel",
  online_link: "",
  cancel_deadline_hours: DEFAULT_CANCEL_DEADLINE_HOURS,
  confirmation_message: "",
  reminder_message: "",
  volunteer_capacity: null,
  volunteer_auto_approve: false,
  volunteer_message: "",
};

function isProvided([, value]: [string, unknown]): boolean {
  return value !== undefined && value !== null;
}

/**
 * Résout une fois pour toutes les champs facultatifs du formulaire, pour que
 * l'affichage lise directement la valeur au lieu de répéter `?? défaut` à
 * chaque usage.
 *
 * Un champ absent ou nul reprend sa valeur de repli. Les `null` porteurs de
 * sens — pas d'église organisatrice, capacité illimitée, aucun district — ont
 * justement `null` pour repli : la substitution est neutre pour eux.
 */
export function withDefaults(form: EventInput): EventFormValues {
  const provided = Object.fromEntries(
    Object.entries(form).filter(isProvided),
  ) as Partial<EventFormValues>;
  return { ...FALLBACK_VALUES, ...provided };
}
