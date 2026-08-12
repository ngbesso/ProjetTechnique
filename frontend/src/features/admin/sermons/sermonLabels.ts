// Libellés francophones du catalogue de sermons. Raison de changer : le
// vocabulaire présenté aux responsables de la médiathèque.
import type { Sermon, SermonStatus } from "../../../types";

export const STATUS_LABELS: Record<SermonStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export const STATUSES = Object.keys(STATUS_LABELS) as SermonStatus[];

export function mediaFormatLabel(format: Sermon["format"]): string {
  return format === "video" ? "Vidéo" : "Audio";
}
