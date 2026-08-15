import styles from "../AdminPage.module.css";
import { DataTable } from "../../../components/ui/DataTable";
import { transactionColumns } from "./transactionColumns";
import type { FinanceTransaction } from "../../../types";

/** Vue globale : tous les mouvements de la période, sans regroupement. */
export function GlobalReportView({ transactions }: { transactions: FinanceTransaction[] }) {
  return (
    <div className={styles.listBody}>
      <DataTable
        columns={transactionColumns}
        data={transactions}
        pageSize={10}
        emptyMessage="Aucune transaction sur cette période."
      />
    </div>
  );
}
