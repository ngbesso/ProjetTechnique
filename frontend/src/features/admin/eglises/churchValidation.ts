// Contrôle des coordonnées d'une église avant enregistrement. Raison de
// changer : les exigences de saisie propres aux églises.
//
// Les formats eux-mêmes viennent de lib/validation : ce module se contente de
// dire quels champs de l'église y sont soumis.
import { validateAddress, validateEmailOptional, validatePhone } from "../../../lib/validation";
import type { ChurchInput } from "../../../types";

export interface ChurchFieldErrors {
  phone?: string;
  email?: string;
  address?: string;
}

type ContactFields = Pick<ChurchInput, "phone" | "email" | "address">;

export function validateChurchContact(form: ContactFields): ChurchFieldErrors {
  return {
    phone: validatePhone(form.phone ?? "") ?? undefined,
    email: validateEmailOptional(form.email ?? "") ?? undefined,
    address: validateAddress(form.address ?? "") ?? undefined,
  };
}

export function hasFieldErrors(errors: ChurchFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
