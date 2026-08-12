import styles from "../AdminPage.module.css";
import { createColumnHelper } from "../../../components/ui/DataTable";
import { formatDate } from "../../../lib/format";
import type { OrganiserRow } from "./organiserRows";

const col = createColumnHelper<OrganiserRow>();

interface OrganiserColumnsOptions {
  /** Sans les droits combinés, la liste reste en lecture seule. */
  canManage: boolean;
  onToggleActive: (id: number, isActive: boolean) => void;
  onRevoke: (row: OrganiserRow) => void;
}

export function organiserColumns({
  canManage,
  onToggleActive,
  onRevoke,
}: OrganiserColumnsOptions) {
  return [
    col.accessor("email", { header: "Courriel" }),
    col.accessor((o) => o.assignment.church_name, {
      id: "church",
      header: "Église de rattachement",
    }),
    col.accessor("is_active", {
      header: "Statut",
      cell: (info) => (
        <span
          className={`${styles.badge} ${info.getValue() ? styles.badgeActive : styles.badgeInactive}`}
        >
          {info.getValue() ? "Actif" : "Désactivé"}
        </span>
      ),
    }),
    col.accessor("event_count", { header: "Événements créés" }),
    col.accessor("created_at", {
      header: "Compte créé le",
      cell: (info) => formatDate(info.getValue()),
    }),
    ...(canManage
      ? [
          col.display({
            id: "actions",
            header: "Actions",
            cell: (info) => {
              const o = info.row.original;
              return (
                <div className={styles.actions}>
                  <button
                    className={styles.btnOutlineSm}
                    onClick={() => onToggleActive(o.id, !o.is_active)}
                  >
                    {o.is_active ? "Désactiver" : "Réactiver"}
                  </button>
                  <button className={styles.btnDanger} onClick={() => onRevoke(o)}>
                    Retirer le rôle
                  </button>
                </div>
              );
            },
          }),
        ]
      : []),
  ];
}
