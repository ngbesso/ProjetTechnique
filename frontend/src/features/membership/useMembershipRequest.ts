// Dépôt d'une demande d'adhésion. Raison de changer : le parcours d'adhésion
// et ce qu'on en restitue au visiteur.
import { useState } from "react";
import { requestMembership } from "../../lib/api/members";
import { YESTERDAY } from "../../lib/format";
import { sanitizePhoneInput, validatePhoneFormat } from "../../lib/validation";
import { EMPTY_MEMBERSHIP } from "./membershipDefaults";
import { toMembershipInput } from "./membershipMapper";
import { hasFieldErrors, validateMembershipFields } from "./membershipValidation";
import type { MembershipFormState } from "./membershipDefaults";
import type { MembershipFieldErrors } from "./membershipValidation";
import type { Church } from "../../types";

/** Issue de la demande, telle qu'annoncée au visiteur. */
export interface MembershipOutcome {
  church: string;
  approved: boolean;
}

export function useMembershipRequest(churches: Church[]) {
  const [form, setForm] = useState<MembershipFormState>(EMPTY_MEMBERSHIP);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<MembershipFieldErrors>({});
  const [outcome, setOutcome] = useState<MembershipOutcome | null>(null);

  function update(patch: Partial<MembershipFormState>) {
    // Le téléphone est signalé dès la saisie d'un caractère interdit (ex. une
    // lettre), sur la valeur brute, puis nettoyé avant d'être stocké : le
    // caractère n'est jamais conservé, mais l'utilisateur voit pourquoi.
    if (patch.telephone !== undefined) {
      const formatError = validatePhoneFormat(patch.telephone);
      setFieldErrors((fe) => ({ ...fe, telephone: formatError ?? undefined }));
      patch = { ...patch, telephone: sanitizePhoneInput(patch.telephone) };
    }
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function clearFieldError(key: keyof MembershipFieldErrors) {
    setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
  }

  async function submit() {
    if (!form.church_id) {
      setError("Veuillez choisir une église.");
      return;
    }
    if (form.birth_date && form.birth_date > YESTERDAY) {
      setError("La date de naissance doit être antérieure à aujourd'hui.");
      return;
    }

    const errs = validateMembershipFields(form);
    setFieldErrors(errs);
    if (hasFieldErrors(errs)) return;

    setSubmitting(true);
    setError("");
    try {
      const created = await requestMembership(toMembershipInput(form));
      const church = churches.find((c) => c.id === Number(form.church_id));
      setOutcome({
        church: church?.name ?? "l'église choisie",
        approved: created.status === "active",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return { form, update, submitting, error, fieldErrors, clearFieldError, outcome, submit };
}
