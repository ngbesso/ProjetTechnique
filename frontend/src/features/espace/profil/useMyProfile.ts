// Fiche du membre connecté : consultation et mise à jour de ses coordonnées.
// Raison de changer : ce qu'un membre peut modifier lui-même.
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { fetchMyProfile, updateMyProfile } from "../../../lib/api/members";
import { validateAddress, validatePhone } from "../../../lib/validation";
import type { Member, MemberSelfInput } from "../../../types";

export interface ContactErrors {
  telephone?: string;
  address?: string;
}

/** Les formats viennent de lib/validation ; ce module dit quels champs y sont soumis. */
function validateContact(m: Member): ContactErrors {
  return {
    telephone: validatePhone(m.telephone ?? "") ?? undefined,
    address: validateAddress(m.address ?? "") ?? undefined,
  };
}

export function useMyProfile() {
  const { member: contextMember, setMember } = useAuth();
  const [member, setLocalMember] = useState<Member | null>(contextMember);
  const [loading, setLoading] = useState(!contextMember);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ContactErrors>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // `setMember` est le setter d'état du contexte : stable d'un rendu à l'autre.
  useEffect(() => {
    fetchMyProfile()
      .then((data) => {
        setLocalMember(data);
        setMember(data);
      })
      .catch(() => setError("Aucune fiche membre n'est liée à votre compte."))
      .finally(() => setLoading(false));
  }, [setMember]);

  function update(patch: Partial<Member>) {
    setLocalMember((m) => (m ? { ...m, ...patch } : m));
  }

  function clearFieldError(key: keyof ContactErrors) {
    setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
  }

  async function save() {
    if (!member) return;

    const errs = validateContact(member);
    setFieldErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setBusy(true);
    setSaved(false);
    setError("");
    try {
      const payload: MemberSelfInput = {
        address: member.address,
        telephone: member.telephone,
        family_status: member.family_status,
      };
      const updated = await updateMyProfile(payload);
      setLocalMember(updated);
      setMember(updated);
      setSaved(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement.");
    } finally {
      setBusy(false);
    }
  }

  return { member, loading, error, fieldErrors, saved, busy, update, clearFieldError, save };
}
