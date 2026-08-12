// Valeurs de départ d'un article. Raison de changer : ce qu'on propose par
// défaut à la rédaction.
import type { PostInput } from "../../../types";

export const EMPTY_POST: PostInput = {
  title: "",
  content: "",
  excerpt: "",
  author: "",
  status: "draft",
  category: "",
};
