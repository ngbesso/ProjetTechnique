import styles from "./SiteFooter.module.css";
import { useNavigate } from "../../context/RouterContext";

export function SiteFooter() {
  const navigate = useNavigate();

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
              <li><button onClick={() => navigate("home")}>Qui sommes-nous</button></li>
              <li><button onClick={() => navigate("sermons")}>Sermons</button></li>
            </ul>
          </div>

          <div className={styles.col}>
            <p className={styles.colTitle}>Participer</p>
            <ul className={styles.links}>
              <li><button onClick={() => navigate("donation")}>Faire un don</button></li>
              <li><button onClick={() => navigate("adhesion")}>Devenir membre</button></li>
            </ul>
          </div>

          <div className={styles.col}>
            <p className={styles.colTitle}>Compte</p>
            <ul className={styles.links}>
              <li><button onClick={() => navigate("adhesion")}>Devenir membre</button></li>
              <li><button onClick={() => navigate("login")}>Se connecter</button></li>
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
