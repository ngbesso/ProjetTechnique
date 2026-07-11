import styles from "./SiteFooter.module.css";
import { Link } from "../../context/RouterContext";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>+</div>
          <div>
            <p className={styles.brandName}>Mission Évangélique</p>
            <p className={styles.brandTagline}>
              Une communauté unie au service de tous.
            </p>
          </div>
        </div>

        <div className={styles.cols}>
          <div className={styles.col}>
            <p className={styles.colTitle}>Découvrir</p>
            <ul className={styles.links}>
              <li><Link page="home">Qui sommes-nous</Link></li>
              <li><Link page="sermons">Sermons</Link></li>
              <li><Link page="blog">Blog</Link></li>
            </ul>
          </div>

          <div className={styles.col}>
            <p className={styles.colTitle}>Participer</p>
            <ul className={styles.links}>
              <li><Link page="donation">Faire un don</Link></li>
              <li><Link page="adhesion">Devenir membre</Link></li>
            </ul>
          </div>

          <div className={styles.col}>
            <p className={styles.colTitle}>Compte</p>
            <ul className={styles.links}>
              <li><Link page="adhesion">Devenir membre</Link></li>
              <li><Link page="login">Se connecter</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} Mission Évangélique — Tous droits réservés.</p>
      </div>
    </footer>
  );
}
