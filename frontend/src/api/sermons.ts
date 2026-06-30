import { api } from "./client";

export interface SermonOut {
  id: string;
  titre: string;
  predicateur: string;
  date_sermon: string | null;
  description: string | null;
  serie: string | null;
  tags: string[];
  format: "audio" | "video";
  duree_secondes: number | null;
  fichier_key: string | null;
  statut: "brouillon" | "publie" | "archive";
  vues: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SermonListOut {
  items: SermonOut[];
  total: number;
  skip: number;
  limit: number;
}

export interface StreamUrlResponse {
  stream_url: string;
  format: "audio" | "video";
  duree_secondes: number | null;
}

export const sermonsApi = {
  list: (skip = 0, limit = 20): Promise<SermonListOut> =>
    api.get(`/sermons?skip=${skip}&limit=${limit}`),

  get: (id: string): Promise<SermonOut> =>
    api.get(`/sermons/${id}`),

  streamUrl: (id: string): Promise<StreamUrlResponse> =>
    api.get(`/sermons/${id}/stream-url`),
};

export function formatDuree(secondes: number | null): string {
  if (!secondes) return "";
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
