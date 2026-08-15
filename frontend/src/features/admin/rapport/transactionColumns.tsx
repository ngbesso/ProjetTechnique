import styles from "../AdminPage.module.css";
import { createColumnHelper } from "../../../components/ui/DataTable";
import { categoryLabel } from "./financeGrouping";
import { downloadAttachment } from "./transactionAttachment";
import type { FinanceTransaction } from "../../../types";

const col = createColumnHelper<FinanceTransaction>();

const BADGE_STYLE = {
  padding: "0.2rem 0.55rem",
  borderRadius: "999px",
  fontSize: "0.78rem",
  fontWeight: 600,
} as const;

/** Colonnes du tableau des mouvements, communes à la vue globale et au détail
 *  d'une catégorie. */
export const transactionColumns = [
  col.accessor("date", {
    header: "Date",
    cell: (info) => new Date(info.getValue()).toLocaleDateString("fr-CA"),
  }),
  col.accessor("type", {
    header: "Type",
    cell: (info) => {
      const value = info.getValue();
      return (
        <span
          className={value === "revenu" ? styles.badgeActive : styles.badgeRejected}
          style={BADGE_STYLE}
        >
          {value === "revenu" ? "Revenu" : "Dépense"}
        </span>
      );
    },
  }),
  col.accessor("category", {
    header: "Catégorie",
    cell: (info) => categoryLabel(info.row.original),
  }),
  col.accessor("amount", {
    header: "Montant",
    cell: (info) => (
      <>
        <strong>{info.getValue().toFixed(2)}</strong> {info.row.original.currency}
      </>
    ),
  }),
  col.accessor("party", { header: "Partie" }),
  col.accessor("note", { header: "Note / justification" }),
  col.display({
    id: "attachment",
    header: "Pièce jointe",
    cell: (info) => {
      const tx = info.row.original;
      return tx.attachment_url ? (
        <button type="button" className={styles.btnOutlineSm} onClick={() => downloadAttachment(tx)}>
          📎 Voir
        </button>
      ) : (
        <em style={{ color: "var(--text-muted)" }}>—</em>
      );
    },
  }),
];
