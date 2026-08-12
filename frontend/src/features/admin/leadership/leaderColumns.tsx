import adminStyles from "../AdminPage.module.css";
import styles from "../LeadershipPanel.module.css";
import { createColumnHelper } from "../../../components/ui/DataTable";
import { LeaderPhotoButton } from "./LeaderPhotoButton";
import type { Church, Leader } from "../../../types";

const col = createColumnHelper<Leader>();

function initials(l: Leader): string {
  return `${l.first_name[0] ?? ""}${l.last_name[0] ?? ""}`.toUpperCase();
}

function fullName(l: Leader): string {
  return `${l.first_name} ${l.last_name}`;
}

function churchLabel(churches: Church[], churchId: number | null): string {
  if (churchId === null) return "—";
  return churches.find((c) => c.id === churchId)?.name ?? `#${churchId}`;
}

interface LeaderColumnsOptions {
  /** Sans le droit de gestion, la liste reste en lecture seule. */
  canManage: boolean;
  churches: Church[];
  onEdit: (leader: Leader) => void;
  onUploadPhoto: (leader: Leader, file: File) => Promise<void>;
  onTogglePublish: (leader: Leader) => void;
  onDelete: (id: number, name: string) => void;
}

export function leaderColumns({
  canManage,
  churches,
  onEdit,
  onUploadPhoto,
  onTogglePublish,
  onDelete,
}: LeaderColumnsOptions) {
  return [
    col.display({
      id: "photo",
      header: "Photo",
      cell: (info) => {
        const l = info.row.original;
        return l.photo_url ? (
          <img className={styles.photo} src={l.photo_url} alt={fullName(l)} />
        ) : (
          <span className={styles.photoPlaceholder}>{initials(l)}</span>
        );
      },
    }),
    col.accessor(fullName, {
      id: "name",
      header: "Nom",
      cell: (info) => (
        <div className={adminStyles.actions} style={{ alignItems: "center" }}>
          <strong>{info.getValue()}</strong>
          {info.row.original.is_published
            ? <span className={styles.badgePublished}>Publié</span>
            : <span className={styles.badgeInactive}>Brouillon</span>}
        </div>
      ),
    }),
    col.accessor((l) => `${l.role} · ${l.title}`, {
      id: "role",
      header: "Rôle / Titre",
    }),
    col.accessor("district", { header: "District", cell: (info) => info.getValue() ?? "—" }),
    col.accessor((l) => churchLabel(churches, l.church_id), { id: "church", header: "Église" }),
    ...(canManage
      ? [
          col.display({
            id: "actions",
            header: "Actions",
            cell: (info) => {
              const l = info.row.original;
              return (
                <div className={adminStyles.actions}>
                  <button className={adminStyles.btnOutlineSm} onClick={() => onEdit(l)}>
                    Modifier
                  </button>
                  <LeaderPhotoButton onUpload={(file) => onUploadPhoto(l, file)} />
                  <button
                    className={l.is_published ? styles.btnCardDeactivate : styles.btnCardActivate}
                    onClick={() => onTogglePublish(l)}
                  >
                    {l.is_published ? "Dépublier" : "Publier"}
                  </button>
                  <button
                    className={adminStyles.btnDanger}
                    onClick={() => onDelete(l.id, fullName(l))}
                  >
                    Supprimer
                  </button>
                </div>
              );
            },
          }),
        ]
      : []),
  ];
}
