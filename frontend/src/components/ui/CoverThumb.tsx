import styles from "./CoverThumb.module.css";

/** Vignette de couverture en cellule de tableau ; `url` est déjà résolue. */
export function CoverThumb({ url }: { url: string | null }) {
  if (!url) return <div className={styles.thumbPlaceholder}>—</div>;
  return <img src={url} alt="" className={styles.thumbImg} />;
}
