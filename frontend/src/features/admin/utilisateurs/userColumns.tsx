import styles from "../AdminPage.module.css";
import { createColumnHelper } from "../../../components/ui/DataTable";
import type { AssignmentRead, UserAdmin } from "../../../types";

const col = createColumnHelper<UserAdmin>();

interface UserColumnsOptions {
  onRevoke: (user: UserAdmin, assignment: AssignmentRead) => void;
  onToggleActive: (user: UserAdmin) => void;
}

export function userColumns({ onRevoke, onToggleActive }: UserColumnsOptions) {
  return [
    col.accessor("email", { header: "Courriel" }),
    col.display({
      id: "roles",
      header: "Rôles (portée)",
      cell: (info) => {
        const u = info.row.original;
        return (
          <div className={styles.actions}>
            {u.assignments.length === 0 && <span className={styles.empty}>—</span>}
            {u.assignments.map((a) => (
              <span key={`${a.role_id}-${a.church_id}`} className={styles.badge}>
                {a.role} @ {a.church_name}
                <button className={styles.chipX} title="Retirer"
                  aria-label={`Retirer le rôle ${a.role} sur ${a.church_name}`}
                  onClick={() => onRevoke(u, a)}>×</button>
              </span>
            ))}
          </div>
        );
      },
    }),
    col.accessor("is_active", {
      header: "Statut",
      cell: (info) => (
        <span className={`${styles.badge} ${info.getValue() ? styles.badgeActive : styles.badgeInactive}`}>
          {info.getValue() ? "Actif" : "Désactivé"}
        </span>
      ),
    }),
    col.display({
      id: "actions_toggle",
      header: "Actions",
      cell: (info) => {
        const u = info.row.original;
        return (
          <button className={styles.btnOutline} onClick={() => onToggleActive(u)}>
            {u.is_active ? "Désactiver" : "Réactiver"}
          </button>
        );
      },
    }),
  ];
}
