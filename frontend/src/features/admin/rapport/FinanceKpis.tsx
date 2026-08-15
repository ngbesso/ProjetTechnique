import styles from "../AdminPage.module.css";
import { IconTrendingUp } from "../../../components/ui/icons";
import { KpiCard } from "../../../components/ui/KpiCard";
import { formatCurrency } from "../../../lib/format";
import { IconTrendingDown, IconWallet } from "./financeIcons";
import type { FinanceReport } from "../../../types";

type KpiFields = Pick<
  FinanceReport,
  "income_cad" | "income_usd" | "expenses_total" | "balance"
>;

/** Un solde négatif passe en ambre : la couleur porte l'alerte. */
export function FinanceKpis({ values }: { values: KpiFields }) {
  return (
    <div className={styles.kpiGrid}>
      <KpiCard
        color="emerald"
        icon={<IconTrendingUp />}
        value={formatCurrency(values.income_cad)}
        label="Revenus"
        sub={values.income_usd > 0 ? `+ ${values.income_usd.toFixed(2)} $ USD` : undefined}
      />
      <KpiCard
        color="rose"
        icon={<IconTrendingDown />}
        value={formatCurrency(values.expenses_total)}
        label="Dépenses"
      />
      <KpiCard
        color={values.balance >= 0 ? "blue" : "amber"}
        icon={<IconWallet />}
        value={formatCurrency(values.balance)}
        label="Solde disponible"
      />
    </div>
  );
}

type SummaryFields = Pick<
  FinanceReport,
  "period_start" | "period_end" | "income_count" | "expense_count"
>;

export function FinanceReportSummary({ values }: { values: SummaryFields }) {
  return (
    <p style={{ fontSize: ".85rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
      Période du {values.period_start} au {values.period_end}
      {" · "}{values.income_count} revenu{values.income_count > 1 ? "s" : ""}
      {" · "}{values.expense_count} dépense{values.expense_count > 1 ? "s" : ""}
    </p>
  );
}
