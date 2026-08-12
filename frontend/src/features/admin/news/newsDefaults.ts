// Valeurs de départ d'une actualité. Raison de changer : ce qu'on propose par
// défaut à la rédaction.
import type { NewsInput } from "../../../types";

export const EMPTY_NEWS: NewsInput = {
  title: "",
  content: "",
  excerpt: "",
  author: "",
  status: "draft",
  category: "",
  is_featured: false,
  position: 0,
};
