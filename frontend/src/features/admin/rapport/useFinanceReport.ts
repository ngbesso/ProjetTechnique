// Consultation du rapport financier sur une période. Raison de changer : la
// façon d'interroger les mouvements et de choisir l'intervalle observé.
import { useEffect, useMemo, useState } from "react";
import { fetchFinanceReport } from "../../../lib/api/finances";
import { reportParams } from "./financePeriods";
import type { ReportParams } from "./financePeriods";
import type { FinancePeriod, FinanceReport } from "../../../types";

export function useFinanceReport() {
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<FinancePeriod | "">("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Mémorisés pour que l'effet ne dépende que d'eux : le rapport est rechargé
  // exactement quand l'intervalle change, sans dépendance implicite.
  const params: ReportParams = useMemo(
    () => reportParams(period, customStart, customEnd),
    [period, customStart, customEnd],
  );

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchFinanceReport(params)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [params]);

  return {
    report,
    loading,
    error,
    params,
    period,
    selectPeriod: setPeriod,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
  };
}
