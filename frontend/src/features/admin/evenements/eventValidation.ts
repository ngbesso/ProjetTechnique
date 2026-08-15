// Règles de passage d'une étape à la suivante. Raison de changer : ce que
// l'organisation exige avant de laisser avancer dans l'assistant.
//
// Rien à reprendre de lib/validation.ts ici : ce module ne valide que des
// présences de champs propres au domaine événement, là où lib/validation
// couvre des formats génériques (téléphone, courriel, adresse).
import type { EventFormValues } from "./eventDefaults";
import type { StepId } from "./eventFormSteps";

/** Champs dont dépendent les règles de validation, et eux seuls. */
type ValidatedFields = Pick<
  EventFormValues,
  "title" | "category" | "date_start" | "format" | "online_link" | "location"
>;

/** Message d'erreur bloquant l'étape, ou `null` si elle est franchissable. */
export function validateStep(step: StepId, values: ValidatedFields): string | null {
  if (step === "info") {
    if (!values.title.trim()) return "Le titre est requis.";
    if (!values.category) return "La catégorie est requise.";
    return null;
  }

  if (step === "date") {
    if (!values.date_start) return "La date de début est requise.";
    const needsLink = values.format === "en_ligne" || values.format === "hybride";
    if (needsLink && !values.online_link.trim()) {
      return "Le lien de connexion est requis pour un événement en ligne ou hybride.";
    }
    if (values.format === "hybride" && !values.location.trim()) {
      return "Le lieu est requis pour un événement hybride.";
    }
    return null;
  }

  return null;
}
