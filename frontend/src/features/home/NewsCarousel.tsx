import { useEffect, useState } from "react";
import styles from "./NewsCarousel.module.css";
import { useNavigate } from "../../context/RouterContext";
import { fetchFeaturedNews, newsCoverUrl } from "../../lib/api/news";
import type { News } from "../../types";

const AUTOPLAY_MS = 6000;

const CATEGORY_GRADIENT: Record<string, string> = {
  Annonces:     "linear-gradient(135deg, #059669 0%, #064e3b 100%)",
  Partenariats: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)",
  Dons:         "linear-gradient(135deg, #d97706 0%, #92400e 100%)",
  Jeunesse:     "linear-gradient(135deg, #db2777 0%, #831843 100%)",
};
const DEFAULT_GRADIENT = "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)";

export function NewsCarousel() {
  const navigate = useNavigate();
  const [items, setItems] = useState<News[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    fetchFeaturedNews(5).then(setItems).catch(() => {});
  }, []);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, items.length]);

  if (items.length === 0) return null;

  const current = items[index];
  const cover = newsCoverUrl(current.cover_image_url);
  const gradient = (current.category && CATEGORY_GRADIENT[current.category]) || DEFAULT_GRADIENT;

  function go(delta: number) {
    setIndex((i) => (i + delta + items.length) % items.length);
  }

  return (
    <div
      className={styles.wrap}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={styles.slide}
        style={cover ? { backgroundImage: `url(${cover})` } : { background: gradient }}
        onClick={() => navigate("actualites", { newsId: current.id })}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && navigate("actualites", { newsId: current.id })}
      >
        <div className={styles.slideOverlay} />
        <div className={styles.slideBody}>
          {current.category && <span className={styles.badge}>{current.category}</span>}
          <h2 className={styles.title}>{current.title}</h2>
          {current.excerpt && <p className={styles.excerpt}>{current.excerpt}</p>}
          <span className={styles.readMore}>Lire la suite →</span>
        </div>
      </div>

      {items.length > 1 && (
        <>
          <div className={styles.dots}>
            {items.map((it, i) => (
              <button
                key={it.id}
                className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
                aria-label={`Actualité ${i + 1}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <div className={styles.arrows}>
            <button className={styles.arrowBtn} aria-label="Précédent" onClick={() => go(-1)}>‹</button>
            <button className={styles.arrowBtn} aria-label="Suivant" onClick={() => go(1)}>›</button>
          </div>
        </>
      )}
    </div>
  );
}
