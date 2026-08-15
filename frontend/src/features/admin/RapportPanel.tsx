import { useState } from "react";
import styles from "./AdminPage.module.css";
import { AnnualDonorReportView } from "./AnnualDonorReportView";
import { CategoryReportView } from "./rapport/CategoryReportView";
import { FinanceKpis, FinanceReportSummary } from "./rapport/FinanceKpis";
import { FinancePeriodFilter } from "./rapport/FinancePeriodFilter";
import { GlobalReportView } from "./rapport/GlobalReportView";
import { useFinanceExport } from "./rapport/useFinanceExport";
import { useFinanceReport } from "./rapport/useFinanceReport";
import type { FinanceTransaction } from "../../types";

type ViewMode = "globale" | "categories" | "annuel-donateurs";

const VIEW_TABS: { id: ViewMode; label: string }[] = [
  { id: "globale", label: "Vue globale" },
  { id: "categories", label: "Vue par catégories" },
  { id: "annuel-donateurs", label: "Rapport annuel par donateur" },
];

// Référence stable : évite de relancer les effets des vues à chaque rendu tant
// qu'aucun rapport n'est chargé.
const NO_TRANSACTIONS: FinanceTransaction[] = [];

export function RapportPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>("globale");
  const finance = useFinanceReport();
  const exporter = useFinanceExport(finance.params);

  // Le rapport annuel par donateur porte sa propre période et son propre
  // export : les réglages de période ne le concernent pas.
  const showPeriodTools = viewMode !== "annuel-donateurs";
  const { report } = finance;

  return (
    <div className={styles.rbacWrapper}>
      {finance.error && <p className={styles.errorMsg} role="alert">{finance.error}</p>}

      {report && <FinanceKpis values={report} />}

      <section className={styles.card}>
        <div className={styles.listHeader}>
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>Rapport financier</h3>
          {showPeriodTools && (
            <div className={styles.actions}>
              <button className={styles.btnOutlineSm} disabled={exporter.exporting}
                onClick={() => exporter.exportAs("pdf")}>PDF</button>
              <button className={styles.btnOutlineSm} disabled={exporter.exporting}
                onClick={() => exporter.exportAs("excel")}>Excel</button>
              <button className={styles.btnOutlineSm} disabled={exporter.exporting}
                onClick={() => exporter.exportAs("csv")}>CSV</button>
            </div>
          )}
        </div>

        {showPeriodTools && report && <FinanceReportSummary values={report} />}

        {showPeriodTools && (
          <FinancePeriodFilter
            period={finance.period}
            onSelect={finance.selectPeriod}
            customStart={finance.customStart}
            onCustomStartChange={finance.setCustomStart}
            customEnd={finance.customEnd}
            onCustomEndChange={finance.setCustomEnd}
          />
        )}

        <div className={styles.filterBar}>
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              className={viewMode === tab.id ? styles.btnPrimary : styles.btnOutlineSm}
              onClick={() => setViewMode(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {exporter.error && <p className={styles.errorMsg} role="alert">{exporter.error}</p>}

        {viewMode === "annuel-donateurs" ? (
          <AnnualDonorReportView />
        ) : finance.loading ? (
          <p className={styles.stateMsg}>Chargement…</p>
        ) : viewMode === "globale" ? (
          <GlobalReportView transactions={report?.transactions ?? NO_TRANSACTIONS} />
        ) : (
          <CategoryReportView transactions={report?.transactions ?? NO_TRANSACTIONS} />
        )}
      </section>
    </div>
  );
}
