// Valeurs de départ d'une fiche de leadership. Raison de changer : ce qu'on
// demande à la création d'une fiche.
import type { LeaderInput } from "../../../types";

export const EMPTY_LEADER: LeaderInput = {
  first_name: "",
  last_name: "",
  title: "",
  role: "",
  district: null,
  church_id: null,
  bio: "",
  email: "",
  phone: "",
  years_of_service: null,
};
