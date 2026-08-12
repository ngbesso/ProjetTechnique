import adminStyles from "../AdminPage.module.css";
import styles from "../EglisesPanel.module.css";
import { createColumnHelper } from "../../../components/ui/DataTable";
import type { Church } from "../../../types";

const col = createColumnHelper<Church>();

interface ChurchColumnsOptions {
  /** Sans le droit de gestion, la liste reste en lecture seule. */
  canManage: boolean;
  onEdit: (church: Church) => void;
  onToggleActive: (church: Church) => void;
  onDelete: (id: number, name: string) => void;
}

/** L'église mère ne se désactive ni ne se supprime : elle fonde la mission. */
export function churchColumns({
  canManage,
  onEdit,
  onToggleActive,
  onDelete,
}: ChurchColumnsOptions) {
  return [
    col.accessor("name", {
      header: "Église",
      cell: (info) => {
        const c = info.row.original;
        return (
          <div className={adminStyles.actions} style={{ alignItems: "center" }}>
            <strong>{c.name}</strong>
            {c.is_mother
              ? <span className={styles.badgeMother}>Mère</span>
              : <span className={styles.badgeAffiliated}>Affiliée</span>}
            {!c.is_active && <span className={styles.badgeInactive}>Désactivée</span>}
          </div>
        );
      },
    }),
    col.accessor("district", { header: "District", cell: (info) => info.getValue() ?? "—" }),
    col.accessor("pastor_name", {
      header: "Pasteur / représentant",
      cell: (info) => info.getValue() ?? "—",
    }),
    col.accessor("address", { header: "Adresse", cell: (info) => info.getValue() ?? "—" }),
    col.accessor("phone", { header: "Téléphone", cell: (info) => info.getValue() ?? "—" }),
    col.accessor("email", { header: "Courriel", cell: (info) => info.getValue() ?? "—" }),
    ...(canManage
      ? [
          col.display({
            id: "actions",
            header: "Actions",
            cell: (info) => {
              const c = info.row.original;
              return (
                <div className={adminStyles.actions}>
                  {c.is_active && (
                    <button className={adminStyles.btnOutlineSm} onClick={() => onEdit(c)}>
                      Modifier
                    </button>
                  )}
                  {!c.is_mother && (
                    <>
                      <button
                        className={c.is_active ? styles.btnCardDeactivate : styles.btnCardActivate}
                        onClick={() => onToggleActive(c)}
                      >
                        {c.is_active ? "Désactiver" : "Réactiver"}
                      </button>
                      <button
                        className={adminStyles.btnDanger}
                        onClick={() => onDelete(c.id, c.name)}
                      >
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              );
            },
          }),
        ]
      : []),
  ];
}
