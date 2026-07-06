import { useEffect, useState } from "react";
import styles from "./SermonsPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { useSermons } from "../../hooks/useSermons";
import { fetchSermon, sermonStreamUrl } from "../../lib/api/sermons";
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

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load({ q: q.trim() || undefined });
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
            placeholder="Rechercher un sermon…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className={styles.btnPrimary}>
            Rechercher
          </button>
        </form>

        {error && (
          <p className={styles.errorMsg} role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className={styles.stateMsg}>Chargement…</p>
        ) : sermons.length === 0 ? (
          <p className={styles.stateMsg}>Aucun sermon publié pour le moment.</p>
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
                    <span className={styles.seriesTag}>{sermon.series}</span>
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
