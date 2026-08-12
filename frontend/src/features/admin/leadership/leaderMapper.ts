// Conversion entre la fiche renvoyée par l'API et le formulaire d'édition.
// Raison de changer : la forme du contrat d'API ou celle du formulaire.
import type { Leader, LeaderInput } from "../../../types";

export function leaderToForm(l: Leader): LeaderInput {
  return {
    first_name: l.first_name,
    last_name: l.last_name,
    title: l.title,
    role: l.role,
    district: l.district,
    church_id: l.church_id,
    bio: l.bio ?? "",
    email: l.email ?? "",
    phone: l.phone ?? "",
    years_of_service: l.years_of_service,
  };
}

/**
 * `null` et non `undefined` pour les champs vidés : `undefined` disparaît de
 * `JSON.stringify`, et le backend (exclude_unset) comprendrait « non fourni »,
 * ignorant silencieusement l'effacement voulu.
 */
export function leaderToPayload(form: LeaderInput): LeaderInput {
  return {
    ...form,
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    title: form.title.trim(),
    bio: form.bio || null,
    email: form.email || null,
    phone: form.phone || null,
  };
}
