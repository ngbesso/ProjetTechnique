import styles from "../AdminPage.module.css";
import { CoverThumb } from "../../../components/ui/CoverThumb";
import { createColumnHelper } from "../../../components/ui/DataTable";
import { coverUrl } from "../../../lib/api/posts";
import { formatDate } from "../../../lib/format";
import { STATUSES, STATUS_LABELS } from "./postLabels";
import type { Post, PostStatus } from "../../../types";

const col = createColumnHelper<Post>();

interface PostColumnsOptions {
  /** Sans le droit de gestion, la liste reste en lecture seule. */
  canManage: boolean;
  onStatusChange: (id: number, status: PostStatus) => void;
  onEdit: (post: Post) => void;
  onDelete: (id: number, title: string) => void;
}

export function postColumns({ canManage, onStatusChange, onEdit, onDelete }: PostColumnsOptions) {
  return [
    col.display({
      id: "cover",
      header: "Couverture",
      cell: (info) => <CoverThumb url={coverUrl(info.row.original.cover_image_url)} />,
    }),
    col.accessor("title", {
      header: "Titre",
      cell: (info) => <strong>{info.getValue()}</strong>,
    }),
    col.accessor("author", { header: "Auteur" }),
    col.accessor("created_at", {
      header: "Date",
      cell: (info) => formatDate(info.getValue()),
    }),
    col.accessor("status", {
      header: "Statut",
      cell: (info) => {
        const p = info.row.original;
        return canManage ? (
          <select className={styles.select} value={p.status}
            onChange={(e) => onStatusChange(p.id, e.target.value as PostStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        ) : STATUS_LABELS[p.status];
      },
    }),
    ...(canManage
      ? [
          col.display({
            id: "actions",
            header: "",
            cell: (info) => {
              const p = info.row.original;
              return (
                <div className={styles.actions}>
                  <button className={styles.btnOutlineSm} onClick={() => onEdit(p)}>Modifier</button>
                  <button className={styles.btnDanger} onClick={() => onDelete(p.id, p.title)}>Supprimer</button>
                </div>
              );
            },
          }),
        ]
      : []),
  ];
}
