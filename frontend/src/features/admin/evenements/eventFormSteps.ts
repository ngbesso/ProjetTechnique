// Séquence de l'assistant de création d'événement. Raison de changer : l'ordre
// ou le découpage des étapes proposées à l'organisateur.

export type StepId = "info" | "date" | "details" | "messages" | "images" | "review";

export const STEPS: { id: StepId; label: string }[] = [
  { id: "info", label: "Informations" },
  { id: "date", label: "Date & Lieu" },
  { id: "details", label: "Détails" },
  { id: "messages", label: "Rappels" },
  { id: "images", label: "Images" },
  { id: "review", label: "Révision" },
];

export const LAST_STEP_INDEX = STEPS.length - 1;
