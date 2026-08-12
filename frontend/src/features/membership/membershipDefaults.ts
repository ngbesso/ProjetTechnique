// Formulaire d'adhésion vierge. Raison de changer : les informations
// demandées à un futur membre.

export interface MembershipFormState {
  church_id: string;
  first_name: string;
  last_name: string;
  email: string;
  address: string;
  birth_date: string;
  sexe: string;
  telephone: string;
  family_status: string;
  is_baptized: boolean;
}

export const EMPTY_MEMBERSHIP: MembershipFormState = {
  church_id: "",
  first_name: "",
  last_name: "",
  email: "",
  address: "",
  birth_date: "",
  sexe: "",
  telephone: "",
  family_status: "",
  is_baptized: false,
};
