import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import { downloadAnnualDonorReport, fetchAnnualDonorReport } from "../../lib/api/finances";
import type { DonorAnnualReport, DonorAnnualReportEntry } from "../../types";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function formatAmount(n: number): string {
  return n === 0 ? "—" : n.toFixed(2);
}

const col = createColumnHelper<DonorAnnualReportEntry>();

const columns = [
  col.accessor("donor_name", { header: "Donateur" }),
  col.accessor("donor_email", { header: "Courriel", cell: (info) => info.getValue() ?? "—" }),
  col.accessor("currency", { header: "Devise" }),
  ...MONTH_LABELS.map((label, i) =>
    col.display({
      id: `month-${i}`,
      header: label,
      cell: (info) => formatAmount(info.row.original.monthly_totals[i]),
    }),
  ),
  col.accessor("annual_total", {
    header: "Total annuel",
    cell: (info) => <strong>{info.getValue().toFixed(2)}</strong>,
  }),
  col.accessor("donation_count", { header: "Nb dons" }),
];

export function AnnualDonorReportView() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [report, setReport] = useState<DonorAnnualReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchAnnualDonorReport(year)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [year]);

  async function handleExport(format: "pdf" | "excel" | "csv") {
    setExporting(true);
    setExportError("");
    try {
      const blob = await downloadAnnualDonorReport(format, year);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = format === "excel" ? "xlsx" : format;
      a.href = url;
      a.download = `rapport-annuel-donateurs-${year}.${ext}`;
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

  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <div>
      <div className={styles.listHeader}>
        <select className={styles.select} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <div className={styles.actions}>
          <button className={styles.btnOutlineSm} disabled={exporting} onClick={() => handleExport("pdf")}>PDF</button>
          <button className={styles.btnOutlineSm} disabled={exporting} onClick={() => handleExport("excel")}>Excel</button>
          <button className={styles.btnOutlineSm} disabled={exporting} onClick={() => handleExport("csv")}>CSV</button>
        </div>
      </div>

      {report && (
        <p style={{ fontSize: ".85rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
          {report.entries.length} donateur{report.entries.length > 1 ? "s" : ""} en {year} · toutes églises confondues
        </p>
      )}

      {error && <p className={styles.errorMsg} role="alert">{error}</p>}
      {exportError && <p className={styles.errorMsg} role="alert">{exportError}</p>}

      {loading ? (
        <p className={styles.stateMsg}>Chargement…</p>
      ) : (
        <div className={styles.listBody}>
          <DataTable
            columns={columns}
            data={report?.entries ?? []}
            pageSize={15}
            emptyMessage="Aucun don enregistré pour cette année."
          />
        </div>
      )}
    </div>
  );
}