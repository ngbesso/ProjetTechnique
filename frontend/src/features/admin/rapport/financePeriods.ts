// Périodes d'observation du rapport financier. Raison de changer : les
// intervalles proposés au responsable des finances.
import type { FinancePeriod } from "../../../types";

export const PERIOD_LABELS: Record<FinancePeriod, string> = {
  day: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  year: "Cette année",
  custom: "Personnalisé",
};

export const PERIODS = Object.keys(PERIOD_LABELS) as FinancePeriod[];

/** Période vide = historique complet : aucun paramètre n'est envoyé. */
export interface ReportParams {
  period?: FinancePeriod;
  start?: string;
  end?: string;
}

export function reportParams(
  period: FinancePeriod | "",
  customStart: string,
  customEnd: string,
): ReportParams {
  if (period === "custom") {
    return { period: "custom", start: customStart || undefined, end: customEnd || undefined };
  }
  return period ? { period } : {};
}
