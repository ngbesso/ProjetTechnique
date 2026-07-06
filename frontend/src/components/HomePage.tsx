import styles from "./HomePage.module.css";

// ── Data ─────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Accueil", href: "#", active: true },
  { label: "Qui sommes-nous", href: "#qui-sommes-nous", dropdown: true },
  { label: "Sermons", href: "#sermons", dropdown: true },
  { label: "Événements", href: "#evenements", dropdown: true },
  { label: "Formation", href: "#formation" },
  { label: "Blog & Articles", href: "#blog" },
] as const;

const PILLARS = [
  { label: "Vision", icon: "👁" },
  { label: "Mission", icon: "🎯" },
  { label: "Valeurs", icon: "💎" },
  { label: "Crédo", icon: "📖" },
  { label: "Principes", icon: "⚖️" },
] as const;

const SERMONS = [
  {
    id: 1,
    title: "La grâce qui transforme",
    preacher: "Pasteur Jean K.",
    date: "8 juin",
  },
  {
    id: 2,
    title: "Marcher dans la foi",
    preacher: "Pasteur A. Mensah",
    date: "1 juin",
  },
  {
    id: 3,
    title: "L'espérance vivante",
    preacher: "Pasteur D. Traoré",
    date: "25 mai",
  },
] as const;

const EVENT_TYPES = [
  { label: "Conférences & Congrès", subtype: "Rassemblements" },
  { label: "Colloque", subtype: "Échanges" },
  { label: "Croisade", subtype: "Évangélisation" },
  { label: "Retraite", subtype: "Ressourcement" },
] as const;

const ARTICLES = [
  {
    id: 1,
    title: "Vivre la communion fraternelle",
    type: "Article",
    readTime: "5 min",
  },
  {
    id: 2,
    title: "Retour sur le congrès 2026",
    type: "Actualité",
    readTime: "3 min",
  },
] as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <a href="#" className={styles.logo}>
          <div className={styles.logoIcon}>+</div>
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>Mission Évangélique</span>
            <span className={styles.logoSubtitle}>unis dans la foi</span>
          </div>
        </a>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary}>
            <span>&#128100;</span> Se connecter
          </button>
          <button className={styles.btnPrimary}>Devenir membre</button>
        </div>
      </div>

      <nav className={styles.nav} aria-label="Navigation principale">
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <li key={item.label} className={styles.navItem}>
              <a
                href={item.href}
                className={
                  'active' in item && item.active
                    ? `${styles.navLink} ${styles.navLinkActive}`
                    : styles.navLink
                }
              >
                {item.label}
                {"dropdown" in item && item.dropdown ? " ▾" : ""}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className={styles.hero}>
      <p className={styles.heroEyebrow}>
        Une famille de foi, au-delà des frontières
      </p>
      <h1 className={styles.heroTitle}>
        Bienvenue dans notre
        <br />
        communauté de foi
      </h1>
      <p className={styles.heroSubtitle}>
        Des Églises affiliées partout, une mission commune.
      </p>
      <div className={styles.heroActions}>
        <button className={styles.btnHeroPrimary}>Devenir membre</button>
        <button className={styles.btnOutlineWhite}>
          <span>♥</span> Faire un don
        </button>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section className={styles.aboutSection}>
      <h2 className={styles.aboutTitle}>Qui sommes-nous</h2>
      <p className={styles.aboutSubtitle}>
        Ce qui nous rassemble et nous guide
      </p>
      <div className={styles.pillarsGrid}>
        {PILLARS.map((pillar) => (
          <div key={pillar.label} className={styles.pillarItem}>
            <div className={styles.pillarDot}>
              <span className={styles.pillarIcon}>{pillar.icon}</span>
            </div>
            <span className={styles.pillarLabel}>{pillar.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SermonsSection() {
  return (
    <section id="sermons" className={`${styles.section} ${styles.sectionAlt}`}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Derniers sermons</h2>
        <a href="#sermons-all" className={styles.seeAllLink}>
          Voir tout &gt;
        </a>
      </div>
      <div className={styles.sermonsGrid}>
        {SERMONS.map((sermon) => (
          <article key={sermon.id} className={styles.sermonCard}>
            <div className={styles.sermonThumb}>
              <button className={styles.playBtn} aria-label={`Écouter : ${sermon.title}`}>
                ▶
              </button>
            </div>
            <div className={styles.sermonInfo}>
              <p className={styles.sermonTitle}>{sermon.title}</p>
              <p className={styles.sermonMeta}>
                {sermon.preacher} · {sermon.date}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EventsSection() {
  return (
    <section id="evenements" className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Événements</h2>
      </div>
      <div className={styles.eventsGrid}>
        {EVENT_TYPES.map((evt) => (
          <div key={evt.label} className={styles.eventCard}>
            <div className={styles.eventDot} />
            <p className={styles.eventType}>{evt.label}</p>
            <p className={styles.eventSubtype}>{evt.subtype}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FormationSection() {
  return (
    <section
      id="formation"
      className={`${styles.section} ${styles.sectionAlt}`}
    >
      <div className={styles.formationBand}>
        <div className={styles.formationInfo}>
          <div className={styles.formationDot} />
          <div>
            <p className={styles.formationTitle}>Formation</p>
            <p className={styles.formationSubtitle}>
              Programmes et parcours — inscription en ligne
            </p>
          </div>
        </div>
        <button className={styles.btnPrimary}>S'inscrire en ligne</button>
      </div>
    </section>
  );
}

function BlogSection() {
  return (
    <section id="blog" className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Blog &amp; Articles</h2>
        <a href="#blog-all" className={styles.seeAllLink}>
          Tout lire &gt;
        </a>
      </div>
      <div className={styles.blogGrid}>
        {ARTICLES.map((article) => (
          <article key={article.id} className={styles.blogCard}>
            <div className={styles.blogThumb}>image</div>
            <div className={styles.blogInfo}>
              <p className={styles.blogTitle}>{article.title}</p>
              <p className={styles.blogMeta}>
                {article.type} · {article.readTime}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DonationBand() {
  return (
    <section className={styles.donationBand}>
      <div className={styles.donationContent}>
        <h2 className={styles.donationTitle}>Soutenir la mission</h2>
        <p className={styles.donationDesc}>
          Reçu fiscal disponible. Historique de vos dons dans votre espace
          membre.
        </p>
        <div className={styles.paymentMethods}>
          {["Carte", "Mobile money", "PayPal"].map((method) => (
            <span key={method} className={styles.paymentChip}>
              {method}
            </span>
          ))}
        </div>
      </div>
      <button className={styles.btnOutlineWhite}>♥ Faire un don</button>
    </section>
  );
}

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div>
          <p className={styles.footerBrand}>Mission Évangélique</p>
          <p className={styles.footerTagline}>
            Une communauté unie
            <br />
            au service de tous.
          </p>
        </div>

        <div>
          <p className={styles.footerColTitle}>Découvrir</p>
          <ul className={styles.footerLinks}>
            <li><a href="#qui-sommes-nous">Qui sommes-nous</a></li>
            <li><a href="#sermons">Sermons</a></li>
            <li><a href="#evenements">Événements</a></li>
          </ul>
        </div>

        <div>
          <p className={styles.footerColTitle}>Participer</p>
          <ul className={styles.footerLinks}>
            <li><a href="#formation">Formation</a></li>
            <li><a href="#blog">Blog &amp; Articles</a></li>
            <li><a href="#don">Faire un don</a></li>
          </ul>
        </div>

        <div>
          <p className={styles.footerColTitle}>Compte</p>
          <ul className={styles.footerLinks}>
            <li><a href="#inscription">Devenir membre</a></li>
            <li><a href="#connexion">Se connecter</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className={styles.page}>
      <Header />
      <main>
        <Hero />
        <AboutSection />
        <SermonsSection />
        <EventsSection />
        <FormationSection />
        <BlogSection />
        <DonationBand />
      </main>
      <Footer />

      <button className={styles.assistantFab} aria-label="Ouvrir l'assistant IA">
        ○ Assistant
      </button>
    </div>
  );
}
