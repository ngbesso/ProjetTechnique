// Conversion entre l'église renvoyée par l'API et le formulaire d'édition.
// Raison de changer : la forme du contrat d'API ou celle du formulaire.
import type { Church, ChurchInput } from "../../../types";

export function churchToForm(c: Church): ChurchInput {
  return {
    name: c.name,
    district: c.district,
    pastor_name: c.pastor_name ?? "",
    address: c.address ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
  };
}
