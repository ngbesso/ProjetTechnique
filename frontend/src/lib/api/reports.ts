import { http } from "./client";

export function downloadAdminReport(domain: string, format: string): Promise<Blob> {
  return http.getBlob(`/admin/reports/${domain}?format=${format}`);
}
