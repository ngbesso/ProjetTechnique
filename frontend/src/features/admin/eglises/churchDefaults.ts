// Valeurs de départ d'une église affiliée. Raison de changer : ce qu'on
// demande à l'ajout d'une église.
import type { ChurchInput } from "../../../types";

export const EMPTY_CHURCH: ChurchInput = {
  name: "",
  district: null,
  pastor_name: "",
  address: "",
  phone: "",
  email: "",
};
