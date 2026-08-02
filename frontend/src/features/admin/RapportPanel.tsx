import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import {
  downloadFinanceReport,
  downloadTransactionAttachment,
  fetchFinanceReport,
} from "../../lib/api/finances";
import { IconTrendingUp } from "../../components/ui/icons";
import { KpiCard } from "../../components/ui/KpiCard";
import type { FinancePeriod, FinanceReport, FinanceTransaction } from "../../types";

// ── Icônes KPI ────────────────────────────────────────────────────────────────

function IconTrendingDown() {
  return (
    <svg viewBox="0 0 24 24">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

const PERIOD_LABELS: Record<FinancePeriod, string> = {
  day: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  year: "Cette année",
  custom: "Personnalisé",
};

function formatCad(amount: number): string {
  return amount.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 });
}

async function downloadAttachment(tx: FinanceTransaction) {
  if (!tx.attachment_url) return;
  const blob = await downloadTransactionAttachment(tx.attachment_url);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `piece-jointe-${tx.type}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const txCol = createColumnHelper<FinanceTransaction>();

export function RapportPanel() {
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<FinancePeriod | "">("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  function currentParams() {
    return period === "custom"
      ? { period: "custom" as const, start: customStart || undefined, end: customEnd || undefined }
      : period
      ? { period }
      : {};
  }

  function loadReport() {
    setLoading(true);
    setError("");
    fetchFinanceReport(currentParams())
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(loadReport, [period, customStart, customEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleExport(format: "pdf" | "excel" | "csv") {
    setExporting(true);
    setExportError("");
    try {
      const blob = await downloadFinanceReport(format, currentParams());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = format === "excel" ? "xlsx" : format;
      a.href = url;
      a.download = `rapport-financier.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Téléchargement impossible.");
    } finally {
      setExporting(false);
    }
  }

  const transactionColumns = [
    txCol.accessor("date", { header: "Date", cell: (info) => new Date(info.getValue()).toLocaleDateString("fr-CA") }),
    txCol.accessor("type", {
      header: "Type",
      cell: (info) => {
        const value = info.getValue();
        return (
          <span
            className={value === "revenu" ? styles.badgeActive : styles.badgeRejected}
            style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600 }}
          >
            {value === "revenu" ? "Revenu" : "Dépense"}
          </span>
        );
      },
    }),
    txCol.accessor("category", { header: "Catégorie" }),
    txCol.accessor("amount", {
      header: "Montant",
      cell: (info) => <><strong>{info.getValue().toFixed(2)}</strong> {info.row.original.currency}</>,
    }),
    txCol.accessor("party", { header: "Partie" }),
    txCol.accessor("note", { header: "Note / justification" }),
    txCol.display({
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

  return (
    <div className={styles.rbacWrapper}>
      {error && <p className={styles.errorMsg} role="alert">{error}</p>}

      {report && (
        <div className={styles.kpiGrid}>
          <KpiCard color="emerald" icon={<IconTrendingUp />} value={formatCad(report.income_cad)} label="Revenus"
            sub={report.income_usd > 0 ? `+ ${report.income_usd.toFixed(2)} $ USD` : undefined} />
          <KpiCard color="rose" icon={<IconTrendingDown />} value={formatCad(report.expenses_total)} label="Dépenses" />
          <KpiCard color={report.balance >= 0 ? "blue" : "amber"} icon={<IconWallet />} value={formatCad(report.balance)} label="Solde disponible" />
        </div>
      )}

      <section className={styles.card}>
        <div className={styles.listHeader}>
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>Rapport financier</h3>
          <div className={styles.actions}>
            <button className={styles.btnOutlineSm} disabled={exporting} onClick={() => handleExport("pdf")}>PDF</button>
            <button className={styles.btnOutlineSm} disabled={exporting} onClick={() => handleExport("excel")}>Excel</button>
            <button className={styles.btnOutlineSm} disabled={exporting} onClick={() => handleExport("csv")}>CSV</button>
          </div>
        </div>

        <div className={styles.filterBar}>
          {(Object.keys(PERIOD_LABELS) as FinancePeriod[]).map((p) => (
            <button
              key={p}
              className={period === p ? styles.btnPrimary : styles.btnOutlineSm}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
          <button className={period === "" ? styles.btnPrimary : styles.btnOutlineSm} onClick={() => setPeriod("")}>
            Historique complet
          </button>
        </div>

        {period === "custom" && (
          <div className={styles.filterBar}>
            <input type="date" className={styles.input} value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            <input type="date" className={styles.input} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
        )}

        {exportError && <p className={styles.errorMsg} role="alert">{exportError}</p>}

        {loading ? (
          <p className={styles.stateMsg}>Chargement…</p>
        ) : (
          <div className={styles.listBody}>
            <DataTable
              columns={transactionColumns}
              data={report?.transactions ?? []}
              pageSize={10}
              emptyMessage="Aucune transaction sur cette période."
            />
          </div>
        )}
      </section>
    </div>
  );
}
