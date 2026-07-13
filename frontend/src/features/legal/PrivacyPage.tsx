import styles from "./PrivacyPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";

export function PrivacyPage() {
  return (
    <div className={styles.page}>
      <SiteHeader />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>Transparence</span>
          <h1 className={styles.heroTitle}>Politique de confidentialité</h1>
          <p className={styles.heroSubtitle}>
            Comment nous recueillons et utilisons vos informations personnelles.
          </p>
        </div>
      </section>

      <main className={styles.main}>
        <div className={styles.card}>
          <p className={styles.notice}>
            ⚠ Document à valider par l'organisation — ce texte est un modèle de
            base et devra être révisé par un responsable juridique ou
            administratif avant toute publication officielle.
          </p>

          <h2 className={styles.sectionTitle}>Quelles données nous collectons</h2>
          <p>
            Selon votre utilisation de la plateforme, nous pouvons conserver :
          </p>
          <ul>
            <li>
              <strong>Votre profil de membre</strong> — nom, prénom, adresse,
              téléphone, date de naissance, sexe, situation familiale et église
              de rattachement, fournis lors de votre demande d'adhésion.
            </li>
            <li>
              <strong>Vos dons</strong> — montant, devise, catégorie, église
              destinataire et date, afin de produire vos reçus et d'assurer le
              suivi comptable.
            </li>
            <li>
              <strong>Vos inscriptions aux formations</strong> — nom, prénom et
              courriel, pour confirmer votre place et vous transmettre les
              informations pratiques.
            </li>
          </ul>

          <h2 className={styles.sectionTitle}>Pourquoi nous les collectons</h2>
          <p>
            Ces informations servent exclusivement à la gestion de la vie
            communautaire : traiter votre demande d'adhésion, organiser les
            activités de votre église, émettre vos reçus de don et vous tenir
            informé(e) des formations auxquelles vous participez. Elles ne
            sont jamais vendues ni partagées à des fins commerciales.
          </p>

          <h2 className={styles.sectionTitle}>Vos droits — nous contacter</h2>
          <p>
            Vous pouvez en tout temps demander à consulter, corriger ou faire
            supprimer les informations vous concernant. Pour toute demande,
            communiquez avec votre église ou écrivez-nous à l'adresse courriel
            indiquée dans le pied de page du site.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
