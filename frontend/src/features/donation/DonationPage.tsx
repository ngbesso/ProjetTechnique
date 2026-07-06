import styles from "./DonationPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";

const ZEFFY_FORM_URL = import.meta.env.VITE_ZEFFY_FORM_URL as string | undefined;

export function DonationPage() {
  return (
    <div className={styles.page}>
      <SiteHeader activePage="donation" />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>♥ Faire un don</span>
          <h1 className={styles.heroTitle}>Soutenir notre mission</h1>
          <p className={styles.heroSubtitle}>
            Chaque don, quelle qu'en soit la taille, contribue à avancer la
            mission et à renforcer notre communauté.
          </p>
        </div>
      </section>

      <main className={styles.main}>
        <div className={styles.formCard} style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 className={styles.formTitle}>Faire un don</h2>
          <p className={styles.formSubtitle}>
            Votre don est traité de façon sécurisée par Zeffy — un reçu vous
            sera envoyé automatiquement par courriel.
          </p>

          {ZEFFY_FORM_URL ? (
            <div className={styles.zeffyEmbedWrapper}>
              <iframe
                title="Formulaire de don"
                src={ZEFFY_FORM_URL}
                className={styles.zeffyEmbed}
              />
            </div>
          ) : (
            <p className={styles.errorMsg} role="alert">
              Le formulaire de don n'est pas encore configuré.
            </p>
          )}

          <div className={styles.summaryBadges} style={{ marginTop: "1.5rem" }}>
            <span className={styles.badge}>🔒 Paiement sécurisé (Zeffy)</span>
            <span className={styles.badge}>📄 Reçu fiscal automatique</span>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
