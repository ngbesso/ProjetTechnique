import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { type SermonOut, formatDuree, sermonsApi } from "../api/sermons";
import styles from "./SermonPlayerPage.module.css";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ── États possibles de la page ────────────────────────────────────────────────

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; sermon: SermonOut };

// ── Lecteur audio/vidéo ───────────────────────────────────────────────────────

interface PlayerProps {
  streamUrl: string;
  format: "audio" | "video";
  dureeSecondes: number | null;
  titre: string;
}

function Player({ streamUrl, format, dureeSecondes, titre }: PlayerProps) {
  const mediaRef = useRef<HTMLAudioElement & HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(dureeSecondes ?? 0);

  function togglePlay() {
    const el = mediaRef.current;
    if (!el) return;
    if (el.paused) { el.play(); setPlaying(true); }
    else { el.pause(); setPlaying(false); }
  }

  function handleTimeUpdate() {
    const el = mediaRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
    setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
  }

  function handleLoadedMetadata() {
    if (mediaRef.current) setDuration(mediaRef.current.duration);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = (Number(e.target.value) / 100) * el.duration;
    setProgress(Number(e.target.value));
  }

  const mediaProps = {
    src: streamUrl,
    onTimeUpdate: handleTimeUpdate,
    onLoadedMetadata: handleLoadedMetadata,
    onEnded: () => setPlaying(false),
  };

  return (
    <div className={styles.player}>
      {format === "video" ? (
        <video ref={mediaRef as React.RefObject<HTMLVideoElement>} style={{ width: "100%" }} {...mediaProps} />
      ) : (
        <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} style={{ display: "none" }} {...mediaProps} />
      )}

      <div className={styles.controls}>
        <button className={styles.playBtn} onClick={togglePlay} aria-label={playing ? "Pause" : "Lecture"}>
          {playing ? "⏸" : "▶"}
        </button>
        <span className={styles.time}>{formatDuree(Math.floor(currentTime))}</span>
        <input
          type="range"
          className={styles.progressBar}
          min={0} max={100} value={progress}
          onChange={handleSeek}
          aria-label={`Progression de ${titre}`}
        />
        <span className={styles.time}>{formatDuree(Math.floor(duration))}</span>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function SermonPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    if (!id) return;
    sermonsApi.get(id)
      .then((sermon) => setState({ status: "ready", sermon }))
      .catch(() => setState({ status: "error", message: "Sermon introuvable." }));
  }, [id]);

  if (state.status === "loading") return <div className={styles.centered}>Chargement…</div>;

  if (state.status === "error") {
    return (
      <div className={styles.centered}>
        <p>{state.message}</p>
        <Link to="/" className={styles.backLink}>← Retour à l'accueil</Link>
      </div>
    );
  }

  const { sermon } = state;
  const streamUrl = `${API_BASE}/sermons/${sermon.id}/stream`;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link to="/" className={styles.backLink}>← Retour</Link>

        <div className={styles.meta}>
          {sermon.serie && <span className={styles.serie}>{sermon.serie}</span>}
          <h1 className={styles.titre}>{sermon.titre}</h1>
          <p className={styles.predicateur}>{sermon.predicateur}</p>
          {sermon.date_sermon && (
            <p className={styles.date}>
              {new Date(sermon.date_sermon).toLocaleDateString("fr-CA", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          )}
          {sermon.tags.length > 0 && (
            <div className={styles.tags}>
              {sermon.tags.map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}
            </div>
          )}
        </div>

        <Player
          streamUrl={streamUrl}
          format={sermon.format}
          dureeSecondes={sermon.duree_secondes}
          titre={sermon.titre}
        />

        {sermon.description && (
          <div className={styles.description}>
            <h2 className={styles.descTitle}>À propos de ce sermon</h2>
            <p>{sermon.description}</p>
          </div>
        )}

        <p className={styles.vues}>{sermon.vues} écoute{sermon.vues !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
