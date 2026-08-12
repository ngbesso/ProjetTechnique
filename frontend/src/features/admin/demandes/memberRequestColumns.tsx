import styles from "../AdminPage.module.css";
import { createColumnHelper } from "../../../components/ui/DataTable";
import { formatDate } from "../../../lib/format";
import { STATUS_BADGE_CLASS, STATUS_LABELS } from "./memberRequestLabels";
import type { MemberRequestAdmin } from "../../../types";

const col = createColumnHelper<MemberRequestAdmin>();

interface MemberRequestColumnsOptions {
  /** Sans le droit de gestion, la liste reste en lecture seule. */
  canManage: boolean;
  onHandle: (request: MemberRequestAdmin) => void;
}

export function memberRequestColumns({ canManage, onHandle }: MemberRequestColumnsOptions) {
  return [
    col.accessor("member_name", { header: "Membre" }),
    col.accessor("member_email", { header: "Courriel" }),
    col.accessor("request_type", { header: "Type" }),
    col.accessor("message", {
      header: "Message",
      cell: (info) => <span style={{ whiteSpace: "pre-wrap" }}>{info.getValue()}</span>,
    }),
    col.accessor("created_at", {
      header: "Reçue le",
      cell: (info) => formatDate(info.getValue()),
    }),
    col.accessor("status", {
      header: "Statut",
      cell: (info) => {
        const value = info.getValue();
        return (
          <span className={`${styles.badge} ${styles[STATUS_BADGE_CLASS[value]]}`}>
            {STATUS_LABELS[value]}
          </span>
        );
      },
    }),
    col.display({
      id: "response",
      header: "Réponse",
      cell: (info) => {
        const r = info.row.original;
        if (!r.admin_response) {
          return <span style={{ color: "var(--text-muted)" }}>—</span>;
        }
        return (
          <>
            <div style={{ whiteSpace: "pre-wrap" }}>{r.admin_response}</div>
            {r.handled_by_email && (
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                par {r.handled_by_email}
              </div>
            )}
          </>
        );
      },
    }),
    ...(canManage
      ? [
          col.display({
            id: "actions",
            header: "",
            cell: (info) => (
              <div className={styles.actions}>
                <button
                  className={styles.btnOutlineSm}
                  onClick={() => onHandle(info.row.original)}
                >
                  Traiter
                </button>
              </div>
            ),
          }),
        ]
      : []),
  ];
}
