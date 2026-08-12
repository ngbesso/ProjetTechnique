// Conversion du formulaire vers la demande envoyée à l'API. Raison de changer :
// la forme du contrat d'API.
import type { MembershipFormState } from "./membershipDefaults";
import type { MembershipInput } from "../../types";

export function toMembershipInput(form: MembershipFormState): MembershipInput {
  return {
    church_id: Number(form.church_id),
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim(),
    address: form.address.trim() || undefined,
    birth_date: form.birth_date || undefined,
    sexe: form.sexe || undefined,
    telephone: form.telephone.trim() || undefined,
    family_status: form.family_status || undefined,
    is_baptized: form.is_baptized,
  };
}
