// Export du rapport financier. Raison de changer : les formats proposés et la
// façon de les récupérer.
import { useState } from "react";
import { downloadFinanceReport } from "../../../lib/api/finances";
import { downloadBlob } from "../../../lib/download";
import type { ReportParams } from "./financePeriods";

export type ExportFormat = "pdf" | "excel" | "csv";

const EXTENSIONS: Record<ExportFormat, string> = {
  pdf: "pdf",
  excel: "xlsx",
  csv: "csv",
};

export function useFinanceExport(params: ReportParams) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  async function exportAs(format: ExportFormat) {
    setExporting(true);
    setError("");
    try {
      const blob = await downloadFinanceReport(format, params);
      downloadBlob(blob, `rapport-financier.${EXTENSIONS[format]}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Téléchargement impossible.");
    } finally {
      setExporting(false);
    }
  }

  return { exporting, error, exportAs };
}
