// Valeurs de départ d'un sermon. Raison de changer : ce qu'on propose par
// défaut lors du dépôt d'une prédication.
import type { SermonInput } from "../../../types";

export const EMPTY_SERMON: SermonInput = {
  title: "",
  preacher: "",
  sermon_date: "",
  description: "",
  series: "",
  status: "draft",
};
