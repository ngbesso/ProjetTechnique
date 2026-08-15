import { useEffect, useMemo, useState } from "react";
import styles from "../AdminPage.module.css";
import { DataTable } from "../../../components/ui/DataTable";
import { CategoryGroupList } from "./CategoryGroupList";
import { groupByCategory, transactionsOf } from "./financeGrouping";
import { transactionColumns } from "./transactionColumns";
import type { CategoryGroup } from "./financeGrouping";
import type { FinanceTransaction } from "../../../types";

/**
 * Vue par catégories : sous-totaux à gauche et à droite, détail de la catégorie
 * retenue en dessous. La sélection ne vit que dans cette vue — en sortir la
 * remet à zéro sans que la page ait à s'en occuper.
 */
export function CategoryReportView({ transactions }: { transactions: FinanceTransaction[] }) {
  const [selected, setSelected] = useState<CategoryGroup | null>(null);

  // Regroupement et détail calculés à partir des transactions déjà chargées :
  // basculer de vue ou de catégorie est instantané, sans appel réseau.
  const groups = useMemo(() => groupByCategory(transactions), [transactions]);

  // Les transactions affichées ne correspondraient plus à la catégorie retenue
  // après un changement de période.
  useEffect(() => setSelected(null), [transactions]);

  const detail = selected ? transactionsOf(transactions, selected) : [];

  function toggle(group: CategoryGroup) {
    setSelected((prev) => (prev?.key === group.key ? null : group));
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <CategoryGroupList
          title="Revenus"
          groups={groups.filter((g) => g.type === "revenu")}
          emptyMessage="Aucun revenu sur cette période."
          selectedKey={selected?.key}
          onSelect={toggle}
        />
        <CategoryGroupList
          title="Dépenses"
          groups={groups.filter((g) => g.type === "dépense")}
          emptyMessage="Aucune dépense sur cette période."
          selectedKey={selected?.key}
          onSelect={toggle}
        />
      </div>

      {selected && (
        <div style={{ marginTop: "1.5rem" }}>
          <div className={styles.listHeader}>
            <h4 style={{ margin: 0 }}>
              Détails — {selected.category}
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                {" "}({selected.type === "revenu" ? "Revenu" : "Dépense"}, {selected.currency})
              </span>
            </h4>
            <button className={styles.btnOutlineSm} onClick={() => setSelected(null)}>
              Fermer
            </button>
          </div>
          <div className={styles.listBody}>
            <DataTable
              columns={transactionColumns}
              data={detail}
              pageSize={10}
              emptyMessage="Aucune transaction dans cette catégorie."
            />
          </div>
        </div>
      )}
    </>
  );
}
