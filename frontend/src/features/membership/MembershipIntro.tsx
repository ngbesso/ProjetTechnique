import styles from "./MembershipPage.module.css";

const WHY_ITEMS = [
  {
    icon: "🤝",
    title: "Communauté fraternelle",
    text: "Des membres unis par la foi, qui se soutiennent et grandissent ensemble dans la prière et le service.",
  },
  {
    icon: "📖",
    title: "Formation & croissance",
    text: "Des parcours bibliques, séminaires et retraites pour approfondir votre foi et votre vocation.",
  },
  {
    icon: "🌍",
    title: "Mission & rayonnement",
    text: "Participer à des croisades, congrès et actions d'évangélisation sur tout le territoire et au-delà.",
  },
] as const;

/** Bandeau d'accueil, arguments et témoignage précédant le formulaire. */
export function MembershipIntro() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>Rejoindre la mission</span>
          <h1 className={styles.heroTitle}>Devenez membre de notre communauté</h1>
          <p className={styles.heroSub}>
            Une famille de foi qui vous accueille, vous accompagne
            et vous envoie partout dans le monde.
          </p>
          <a href="#formulaire" className={styles.heroCta}>
            Remplir le formulaire ↓
          </a>
        </div>
        <div className={styles.heroDecor} aria-hidden="true" />
      </section>

      <section className={styles.whySection}>
        <h2 className={styles.whySectionTitle}>Pourquoi rejoindre la mission ?</h2>
        <p className={styles.whySectionSub}>Ce qui vous attend au sein de notre communauté</p>
        <div className={styles.whyGrid}>
          {WHY_ITEMS.map((item) => (
            <div key={item.title} className={styles.whyCard}>
              <div className={styles.whyCardImg}>
                <span className={styles.whyCardIcon} aria-hidden>{item.icon}</span>
              </div>
              <h3 className={styles.whyCardTitle}>{item.title}</h3>
              <p className={styles.whyCardText}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.quoteBand}>
        <blockquote className={styles.quote}>
          « Rejoindre cette mission a transformé ma vie.
          Je me sens entouré, formé et envoyé. »
          <cite className={styles.quoteCite}>— Pasteur A. Mensah, Région Est</cite>
        </blockquote>
      </section>
    </>
  );
}
