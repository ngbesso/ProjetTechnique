import styles from "../AdminPage.module.css";
import { createColumnHelper } from "../../../components/ui/DataTable";
import { STATUSES, STATUS_LABELS, mediaFormatLabel } from "./sermonLabels";
import type { Sermon, SermonStatus } from "../../../types";

const col = createColumnHelper<Sermon>();

interface SermonColumnsOptions {
  /** Sans le droit de gestion, la liste reste en lecture seule. */
  canManage: boolean;
  onStatusChange: (id: number, status: SermonStatus) => void;
  onPlay: (sermon: Sermon) => void;
  onEdit: (sermon: Sermon) => void;
  onDelete: (id: number, title: string) => void;
}

export function sermonColumns({
  canManage,
  onStatusChange,
  onPlay,
  onEdit,
  onDelete,
}: SermonColumnsOptions) {
  return [
    col.accessor("title", {
      header: "Titre",
      cell: (info) => <strong>{info.getValue()}</strong>,
    }),
    col.accessor("preacher", { header: "Prédicateur" }),
    col.accessor("sermon_date", { header: "Date" }),
    col.accessor("format", {
      header: "Format",
      cell: (info) => mediaFormatLabel(info.getValue()),
    }),
    col.accessor("status", {
      header: "Statut",
      cell: (info) => {
        const s = info.row.original;
        return canManage ? (
          <select
            className={styles.select}
            value={s.status}
            onChange={(e) => onStatusChange(s.id, e.target.value as SermonStatus)}
          >
            {STATUSES.map((st) => (
              <option key={st} value={st}>{STATUS_LABELS[st]}</option>
            ))}
          </select>
        ) : STATUS_LABELS[s.status];
      },
    }),
    ...(canManage
      ? [
          col.display({
            id: "actions",
            header: "",
            cell: (info) => {
              const s = info.row.original;
              return (
                <div className={styles.actions}>
                  <button className={styles.btnOutlineSm} onClick={() => onPlay(s)}>Lire</button>
                  <button className={styles.btnOutlineSm} onClick={() => onEdit(s)}>Modifier</button>
                  <button className={styles.btnDanger} onClick={() => onDelete(s.id, s.title)}>Supprimer</button>
                </div>
              );
            },
          }),
        ]
      : []),
  ];
}
