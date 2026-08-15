import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import { downloadAnnualDonorReport, fetchAnnualDonorReport } from "../../lib/api/finances";
import type { DonorAnnualReport, DonorAnnualReportEntry } from "../../types";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function formatAmount(n: number): string {
  return n === 0 ? "—" : n.toFixed(2);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const col = createColumnHelper<DonorAnnualReportEntry>();

export function AnnualDonorReportView() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [report, setReport] = useState<DonorAnnualReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [downloadingMemberId, setDownloadingMemberId] = useState<number | null>(null);

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
      const ext = format === "excel" ? "xlsx" : format;
      downloadBlob(blob, `rapport-annuel-donateurs-${year}.${ext}`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Téléchargement impossible.");
    } finally {
      setExporting(false);
    }
  }

  async function handleIndividualDownload(entry: DonorAnnualReportEntry) {
    if (entry.member_id === null) return;
    setDownloadingMemberId(entry.member_id);
    setExportError("");
    try {
      const blob = await downloadAnnualDonorReport("pdf", year, entry.member_id);
      const slug = entry.donor_name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-");
      downloadBlob(blob, `rapport-annuel-${slug}-${year}.pdf`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Téléchargement impossible.");
    } finally {
      setDownloadingMemberId(null);
    }
  }

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
    col.display({
      id: "individual",
      // Réservé aux membres inscrits (member_id) : un donateur externe ou
      // anonyme n'a pas d'identité stable à filtrer côté serveur.
      header: "Rapport individuel",
      cell: (info) => {
        const entry = info.row.original;
        if (entry.member_id === null) {
          return <span style={{ color: "var(--text-muted)" }}>—</span>;
        }
        const isDownloading = downloadingMemberId === entry.member_id;
        return (
          <button
            type="button"
            className={styles.btnOutlineSm}
            disabled={isDownloading}
            onClick={() => handleIndividualDownload(entry)}
          >
            {isDownloading ? "…" : "📄 PDF"}
          </button>
        );
      },
    }),
  ];

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