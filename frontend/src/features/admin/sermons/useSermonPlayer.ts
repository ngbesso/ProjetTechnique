// Lecture d'un sermon depuis l'administration. Raison de changer : la façon
// d'obtenir puis de restituer le média.
import { useState } from "react";
import { fetchSermonAdminMediaUrl } from "../../../lib/api/sermons";
import type { Sermon } from "../../../types";

export function useSermonPlayer() {
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function play(s: Sermon) {
    setSermon(s);
    setMediaUrl(null);
    setLoading(true);
    try {
      const res = await fetchSermonAdminMediaUrl(s.id);
      setMediaUrl(res.url);
    } catch {
      setMediaUrl(null);
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setSermon(null);
    setMediaUrl(null);
  }

  return { sermon, mediaUrl, loading, play, close };
}
