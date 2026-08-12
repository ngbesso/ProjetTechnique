import styles from "../AdminPage.module.css";
import type { Sermon } from "../../../types";

interface SermonPlayerModalProps {
  sermon: Sermon;
  /** URL signée, `null` tant qu'elle n'est pas obtenue ou en cas d'échec. */
  mediaUrl: string | null;
  loading: boolean;
  onClose: () => void;
}

export function SermonPlayerModal({ sermon, mediaUrl, loading, onClose }: SermonPlayerModalProps) {
  const isVideo = sermon.format === "video";

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderIcon} aria-hidden>{isVideo ? "🎬" : "🎧"}</div>
          <div className={styles.modalHeaderText}>
            <h2 className={styles.modalName}>{sermon.title}</h2>
            <span className={styles.modalSubtitle}>
              {sermon.preacher} · {sermon.sermon_date}
            </span>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className={styles.modalBody}>
          {loading && (
            <p style={{ textAlign: "center", color: "var(--text-muted)" }}>Chargement…</p>
          )}
          {!loading && mediaUrl && (
            isVideo ? (
              <video controls autoPlay style={{ width: "100%", borderRadius: "6px" }} src={mediaUrl} />
            ) : (
              <audio controls autoPlay style={{ width: "100%" }} src={mediaUrl} />
            )
          )}
          {!loading && !mediaUrl && (
            <p style={{ textAlign: "center", color: "var(--color-danger)" }}>
              Impossible de charger le fichier média.
            </p>
          )}
          {sermon.description && (
            <p style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {sermon.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
