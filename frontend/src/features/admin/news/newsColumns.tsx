import styles from "../AdminPage.module.css";
import { CoverThumb } from "../../../components/ui/CoverThumb";
import { createColumnHelper } from "../../../components/ui/DataTable";
import { newsCoverUrl } from "../../../lib/api/news";
import { formatDate } from "../../../lib/format";
import { FEATURED_HINT, STATUSES, STATUS_LABELS } from "./newsLabels";
import type { News, NewsStatus } from "../../../types";

const col = createColumnHelper<News>();

interface NewsColumnsOptions {
  /** Sans le droit de gestion, la liste reste en lecture seule. */
  canManage: boolean;
  onStatusChange: (id: number, status: NewsStatus) => void;
  onToggleFeatured: (id: number, isFeatured: boolean) => void;
  onEdit: (news: News) => void;
  onDelete: (id: number, title: string) => void;
}

export function newsColumns({
  canManage,
  onStatusChange,
  onToggleFeatured,
  onEdit,
  onDelete,
}: NewsColumnsOptions) {
  return [
    col.display({
      id: "cover",
      header: "Couverture",
      cell: (info) => <CoverThumb url={newsCoverUrl(info.row.original.cover_image_url)} />,
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
    col.display({
      id: "featured",
      header: "À la une",
      cell: (info) => {
        const n = info.row.original;
        if (!canManage) return n.is_featured ? "★" : "";
        return (
          <input
            type="checkbox"
            checked={n.is_featured}
            onChange={(e) => onToggleFeatured(n.id, e.target.checked)}
            title={FEATURED_HINT}
          />
        );
      },
    }),
    col.accessor("status", {
      header: "Statut",
      cell: (info) => {
        const n = info.row.original;
        return canManage ? (
          <select className={styles.select} value={n.status}
            onChange={(e) => onStatusChange(n.id, e.target.value as NewsStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        ) : STATUS_LABELS[n.status];
      },
    }),
    ...(canManage
      ? [
          col.display({
            id: "actions",
            header: "",
            cell: (info) => {
              const n = info.row.original;
              return (
                <div className={styles.actions}>
                  <button className={styles.btnOutlineSm} onClick={() => onEdit(n)}>Modifier</button>
                  <button className={styles.btnDanger} onClick={() => onDelete(n.id, n.title)}>Supprimer</button>
                </div>
              );
            },
          }),
        ]
      : []),
  ];
}
