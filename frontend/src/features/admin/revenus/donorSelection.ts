// Origine d'un revenu. Raison de changer : les façons dont un don peut être
// rattaché à quelqu'un.
import type { Donor, Member } from "../../../types";

/** Le donateur est soit anonyme (saisi en texte libre), soit un membre
 *  existant, soit un donateur enregistré. */
export type DonorSelection =
  | { mode: "anonyme"; name: string; email: string }
  | { mode: "membre"; member: Member | null }
  | { mode: "donateur"; donor: Donor | null };

export type DonorMode = DonorSelection["mode"];

export const ANONYMOUS_DONOR: DonorSelection = { mode: "anonyme", name: "", email: "" };

/** Repart d'une sélection vierge : changer de mode n'hérite de rien. */
export function emptySelection(mode: DonorMode): DonorSelection {
  if (mode === "membre") return { mode, member: null };
  if (mode === "donateur") return { mode, donor: null };
  return ANONYMOUS_DONOR;
}

export interface DonorPayload {
  member_id?: number;
  donor_id?: number;
  donor_name?: string;
  donor_email?: string;
}

/** Traduit la sélection en champs attendus par l'API ; les champs des autres
 *  modes restent absents. */
export function donorPayload(selection: DonorSelection): DonorPayload {
  if (selection.mode === "membre") {
    return { member_id: selection.member?.id, donor_id: undefined, donor_name: undefined, donor_email: undefined };
  }
  if (selection.mode === "donateur") {
    return { member_id: undefined, donor_id: selection.donor?.id, donor_name: undefined, donor_email: undefined };
  }
  return {
    member_id: undefined,
    donor_id: undefined,
    donor_name: selection.name.trim() || undefined,
    donor_email: selection.email.trim() || undefined,
  };
}
