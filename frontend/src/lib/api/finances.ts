import { http } from "./client";
import type { DonorAnnualReport, FinancePeriod, FinanceReport } from "../../types";

export function fetchFinanceReport(params?: {
  period?: FinancePeriod;
  start?: string;
  end?: string;
}): Promise<FinanceReport> {
  const qs = new URLSearchParams();
  if (params?.period) qs.set("period", params.period);
  if (params?.start) qs.set("start", params.start);
  if (params?.end) qs.set("end", params.end);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return http.get<FinanceReport>(`/finances/report${suffix}`);
}

/** Télécharge une pièce jointe de transaction : `attachment_url` pointe déjà
 * vers le bon endpoint (don ou dépense), inutile de le redériver ici. */
export function downloadTransactionAttachment(attachmentUrl: string): Promise<Blob> {
  return http.getBlob(attachmentUrl);
}

export function downloadFinanceReport(
  format: "pdf" | "excel" | "csv",
  params?: { period?: FinancePeriod; start?: string; end?: string },
): Promise<Blob> {
  const qs = new URLSearchParams({ format });
  if (params?.period) qs.set("period", params.period);
  if (params?.start) qs.set("start", params.start);
  if (params?.end) qs.set("end", params.end);
  return http.getBlob(`/finances/report/export?${qs.toString()}`);
}

export function fetchAnnualDonorReport(year: number, memberId?: number): Promise<DonorAnnualReport> {
  const qs = new URLSearchParams({ year: String(year) });
  if (memberId !== undefined) qs.set("member_id", String(memberId));
  return http.get<DonorAnnualReport>(`/finances/rapport-annuel-donateurs?${qs.toString()}`);
}

export function downloadAnnualDonorReport(
  format: "pdf" | "excel" | "csv",
  year: number,
  memberId?: number,
): Promise<Blob> {
  const qs = new URLSearchParams({ format, year: String(year) });
  if (memberId !== undefined) qs.set("member_id", String(memberId));
  return http.getBlob(`/finances/rapport-annuel-donateurs/export?${qs.toString()}`);
}
