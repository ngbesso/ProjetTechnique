// Libellés francophones du cycle de vie d'un article. Raison de changer : le
// vocabulaire présenté aux rédacteurs.
import type { PostStatus } from "../../../types";

export const STATUS_LABELS: Record<PostStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export const STATUSES = Object.keys(STATUS_LABELS) as PostStatus[];
