// Libellés francophones du cycle de vie d'une actualité. Raison de changer :
// le vocabulaire présenté aux rédacteurs.
import type { NewsStatus } from "../../../types";

export const STATUS_LABELS: Record<NewsStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export const STATUSES = Object.keys(STATUS_LABELS) as NewsStatus[];

export const FEATURED_HINT = "Mettre en avant sur le carrousel d'accueil";
