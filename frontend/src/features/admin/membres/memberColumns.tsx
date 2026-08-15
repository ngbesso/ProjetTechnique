import styles from "../AdminPage.module.css";
import { createColumnHelper } from "../../../components/ui/DataTable";
import { STATUS_META } from "../MemberDetailModal";
import type { Member } from "../../../types";

const col = createColumnHelper<Member>();

interface MemberColumnsOptions {
  /** Consultation de la fiche : ouverte à tous ceux qui voient la liste. */
  onView: (member: Member) => void;
  canEdit: boolean;
  onEdit: (member: Member) => void;
  canApprove: boolean;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onDeactivate: (id: number) => void;
  onActivate: (id: number) => void;
}

export function memberColumns({
  onView,
  canEdit,
  onEdit,
  canApprove,
  onApprove,
  onReject,
  onDeactivate,
  onActivate,
}: MemberColumnsOptions) {
  return [
    col.accessor("member_code", { header: "Numéro de membre" }),
    col.accessor((m) => `${m.first_name} ${m.last_name}`, {
      id: "name",
      header: "Nom",
      cell: (info) => <strong>{info.getValue()}</strong>,
    }),
    col.accessor("email", { header: "Courriel" }),
    col.accessor("telephone", { header: "Telephone" }),
    col.accessor("status", {
      header: "Statut",
      cell: (info) => {
        const meta = STATUS_META[info.getValue()];
        return <span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span>;
      },
    }),
    col.accessor("is_baptized", {
      header: "Baptisé",
      cell: (info) => (info.getValue() ? "Oui" : "Non"),
    }),
    col.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const m = info.row.original;
        return (
          <div className={styles.actions}>
            <button className={styles.btnOutlineSm} onClick={() => onView(m)}>
              Voir
            </button>
            {canEdit && (
              <button className={styles.btnOutlineSm} onClick={() => onEdit(m)}>
                Modifier
              </button>
            )}
            {canApprove && m.status === "pending" && (
              <>
                <button className={styles.btnPrimarySm} onClick={() => onApprove(m.id)}>
                  Approuver
                </button>
                <button className={styles.btnDanger} onClick={() => onReject(m.id)}>
                  Refuser
                </button>
              </>
            )}
            {canApprove && m.status === "active" && (
              <button className={styles.btnOutline} onClick={() => onDeactivate(m.id)}>
                Désactiver
              </button>
            )}
            {canApprove && m.status === "inactive" && (
              <button className={styles.btnPrimarySm} onClick={() => onActivate(m.id)}>
                Activer
              </button>
            )}
          </div>
        );
      },
    }),
  ];
}
