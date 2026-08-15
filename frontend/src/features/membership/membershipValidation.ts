// Contrôles de saisie du formulaire d'adhésion. Raison de changer : les
// exigences appliquées à une demande.
//
// Les formats viennent de lib/validation : ce module dit seulement quels champs
// y sont soumis.
import { validateAddress, validateEmail, validateName, validatePhone } from "../../lib/validation";
import type { MembershipFormState } from "./membershipDefaults";

export interface MembershipFieldErrors {
  telephone?: string;
  email?: string;
  address?: string;
  first_name?: string;
  last_name?: string;
}

type ValidatedFields = Pick<
  MembershipFormState,
  "telephone" | "email" | "address" | "first_name" | "last_name"
>;

export function validateMembershipFields(form: ValidatedFields): MembershipFieldErrors {
  return {
    telephone: validatePhone(form.telephone) ?? undefined,
    email: validateEmail(form.email) ?? undefined,
    address: validateAddress(form.address) ?? undefined,
    first_name: validateName(form.first_name) ?? undefined,
    last_name: validateName(form.last_name) ?? undefined,
  };
}

export function hasFieldErrors(errors: MembershipFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
