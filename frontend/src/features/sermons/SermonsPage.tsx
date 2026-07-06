import { useEffect, useState } from "react";
import styles from "./SermonsPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { useSermons } from "../../hooks/useSermons";
import { fetchSermon, fetchSermonSeries, sermonStreamUrl } from "../../lib/api/sermons";
import type { Sermon } from "../../types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Player({ sermon, onClose }: { sermon: Sermon; onClose: () => void }) {
  const src = sermonStreamUrl(sermon.id);
  return (
    <div className={styles.playerOverlay} onClick={onClose}>
      <div className={styles.playerCard} onClick={(e) => e.stopPropagation()}>
        <button className={styles.playerClose} onClick={onClose} aria-label="Fermer">
          ✕
        </button>
        <div className={styles.playerMedia}>
          {sermon.format === "video" ? (
            <video className={styles.mediaEl} src={src} controls autoPlay />
          ) : (
            <audio className={styles.mediaElAudio} src={src} controls autoPlay />
          )}
        </div>
        <div className={styles.playerInfo}>
          <h2 className={styles.playerTitle}>{sermon.title}</h2>
          <p className={styles.playerMeta}>
            {sermon.preacher} · {formatDate(sermon.sermon_date)}
          </p>
          {sermon.description && (
            <p className={styles.playerDesc}>{sermon.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function SermonsPage() {
  const { sermons, loading, error, load } = useSermons();
  const [selected, setSelected] = useState<Sermon | null>(null);
  const [q, setQ] = useState("");
  const [series, setSeries] = useState("");
  const [format, setFormat] = useState("");
  const [seriesList, setSeriesList] = useState<string[]>([]);

  useEffect(() => {
    load();
    fetchSermonSeries().then(setSeriesList).catch(() => {});
  }, [load]);

  function applyFilters(overrides?: { q?: string; series?: string; format?: string }) {
    load({
      q: (overrides?.q ?? q).trim() || undefined,
      series: (overrides?.series ?? series) || undefined,
      format: (overrides?.format ?? format) || undefined,
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function handleSeriesChange(val: string) {
    setSeries(val);
    applyFilters({ series: val });
  }

  function handleFormatChange(val: string) {
    setFormat(val);
    applyFilters({ format: val });
  }

  async function play(sermon: Sermon) {
    setSelected(sermon);
    try {
      await fetchSermon(sermon.id);
    } catch {
      // la lecture continue même si le comptage de vues échoue
    }
  }

  return (
    <div className={styles.page}>
      <SiteHeader activePage="sermons" />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>Écouter</span>
          <h1 className={styles.heroTitle}>Sermons</h1>
          <p className={styles.heroSubtitle}>
            Réécoutez les prédications audio et vidéo de la mission.
          </p>
        </div>
      </section>

      <main className={styles.main}>
        <form className={styles.searchBar} onSubmit={handleSearch}>
          <input
            className={styles.searchInput}
            placeholder="Rechercher par titre, prédicateur, série…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className={styles.btnPrimary}>
            Rechercher
          </button>
        </form>

        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={series}
            onChange={(e) => handleSeriesChange(e.target.value)}
          >
            <option value="">Toutes les séries</option>
            {seriesList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <div className={styles.formatChips}>
            {(["", "audio", "video"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`${styles.chip} ${format === f ? styles.chipActive : ""}`}
                onClick={() => handleFormatChange(f)}
              >
                {f === "" ? "Tous" : f === "audio" ? "🎧 Audio" : "🎬 Vidéo"}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className={styles.errorMsg} role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className={styles.stateMsg}>Chargement…</p>
        ) : sermons.length === 0 ? (
          <p className={styles.stateMsg}>Aucun sermon trouvé.</p>
        ) : (
          <div className={styles.grid}>
            {sermons.map((sermon) => (
              <article key={sermon.id} className={styles.card}>
                <button
                  className={styles.thumb}
                  onClick={() => play(sermon)}
                  aria-label={`Écouter : ${sermon.title}`}
                >
                  <span className={styles.playIcon}>▶</span>
                  <span className={styles.formatTag}>
                    {sermon.format === "video" ? "🎬 Vidéo" : "🎧 Audio"}
                  </span>
                </button>
                <div className={styles.cardBody}>
                  <p className={styles.cardTitle}>{sermon.title}</p>
                  <p className={styles.cardMeta}>
                    {sermon.preacher} · {formatDate(sermon.sermon_date)}
                  </p>
                  {sermon.series && (
                    <button
                      className={styles.seriesTag}
                      type="button"
                      onClick={() => handleSeriesChange(sermon.series!)}
                    >
                      {sermon.series}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />

      {selected && <Player sermon={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
