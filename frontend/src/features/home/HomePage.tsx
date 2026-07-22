import { useEffect, useState } from "react";
import styles from "./HomePage.module.css";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "../../context/RouterContext";
import { useSermons } from "../../hooks/useSermons";
import { usePosts } from "../../hooks/usePosts";
import { getEvents } from "../../lib/api/events";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import type { EventItem } from "../../types";

// ── Data ──────────────────────────────────────────────────────────────────────


const STATS = [
  { value: "120+", label: "Églises affiliées" },
  { value: "15 000", label: "Membres actifs" },
  { value: "8", label: "Pays" },
  { value: "40 ans", label: "De mission" },
] as const;

const PILLARS = [
  { label: "Vision", icon: "👁", desc: "Une église par communauté, un disciple par foyer." },
  { label: "Mission", icon: "🎯", desc: "Évangéliser, enraciner et envoyer." },
  { label: "Valeurs", icon: "💎", desc: "Intégrité, amour fraternel, excellence." },
  { label: "Crédo", icon: "📖", desc: "La Bible, seule règle de foi et de vie." },
  { label: "Principes", icon: "⚖️", desc: "Gouvernance partagée, transparence et service." },
] as const;

function formatSermonDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long" });
}

function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
}

const CATEGORY_GRADIENT: Record<string, string> = {
  "Vie spirituelle": "linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)",
  "Témoignage":      "linear-gradient(135deg, #d97706 0%, #92400e 100%)",
  "Méditation":      "linear-gradient(135deg, #0891b2 0%, #164e63 100%)",
  "Actualité":       "linear-gradient(135deg, #059669 0%, #064e3b 100%)",
  "Réflexion":       "linear-gradient(135deg, #db2777 0%, #831843 100%)",
};

function formatEventDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", { day: "numeric" });
}

function formatEventMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", { month: "short" }).replace(".", "");
}

// ── Sub-components ────────────────────────────────────────────────────────────



function Hero() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.is_global_admin || user?.roles.includes("admin");
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <p className={styles.heroEyebrow}>Une famille de foi, au-delà des frontières</p>
        <h1 className={styles.heroTitle}>
          Bienvenue dans notre<br />communauté de foi
        </h1>
        <p className={styles.heroSubtitle}>
          Des Églises affiliées partout, une mission commune —<br />
          servir, former et rayonner ensemble.
        </p>
        <div className={styles.heroActions}>
          {user ? (
            <button
              className={styles.btnHeroPrimary}
              onClick={() => navigate(isAdmin ? "admin" : "espace")}
            >
              {isAdmin ? "Administration" : "Accéder à mon espace"}
            </button>
          ) : (
            <button className={styles.btnHeroPrimary} onClick={() => navigate("adhesion")}>
              Devenir membre
            </button>
          )}
          <button className={styles.btnOutlineWhite} onClick={() => navigate("donation")}>
            <span>♥</span> Faire un don
          </button>
        </div>
      </div>
      <div className={styles.heroVisual} aria-hidden="true" />
      <div className={styles.statsBar}>
        {STATS.map((s) => (
          <div key={s.label} className={styles.statItem}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}



function AboutSection() {
  return (
    <section id="qui-sommes-nous" className={styles.aboutSection}>
      <div className={styles.aboutInner}>
        <div className={styles.aboutLeft}>
          <p className={styles.aboutEyebrow}>Qui sommes-nous</p>
          <h2 className={styles.aboutTitle}>
            Ce qui nous rassemble<br />et nous guide
          </h2>
          <p className={styles.aboutDesc}>
            Fondée il y a plus de 40 ans, Mission Évangélique fédère des centaines
            d'Églises autour d'une vision commune : faire des disciples dans chaque
            communauté et chaque nation.
          </p>
          <a href="#qui-sommes-nous" className={styles.textLink}>
            En savoir plus →
          </a>
        </div>
        <div className={styles.pillarsGrid}>
          {PILLARS.map((pillar) => (
            <div key={pillar.label} className={styles.pillarCard}>
              <span className={styles.pillarIcon}>{pillar.icon}</span>
              <p className={styles.pillarLabel}>{pillar.label}</p>
              <p className={styles.pillarDesc}>{pillar.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SermonsSection() {
  const navigate = useNavigate();
  const { sermons, loading, load } = useSermons();

  useEffect(() => {
    load({ limit: 3 });
  }, [load]);

  return (
    <section id="sermons" className={`${styles.section} ${styles.sectionAlt}`}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>Écouter</p>
          <h2 className={styles.sectionTitle}>Derniers sermons</h2>
        </div>
        <Link page="sermons" className={styles.seeAllLink}>
          Voir tout →
        </Link>
      </div>
      {loading ? (
        <p>Chargement…</p>
      ) : sermons.length === 0 ? (
        <p>Aucun sermon publié pour le moment.</p>
      ) : (
        <div className={styles.sermonsGrid}>
          {sermons.map((sermon) => (
            <article key={sermon.id} className={styles.sermonCard}>
              <div className={styles.sermonThumb}>
                <button
                  className={styles.playBtn}
                  aria-label={`Écouter : ${sermon.title}`}
                  onClick={() => navigate("sermons")}
                >
                  ▶
                </button>
              </div>
              <div className={styles.sermonInfo}>
                <p className={styles.sermonTitle}>{sermon.title}</p>
                <p className={styles.sermonMeta}>
                  {sermon.preacher} · {formatSermonDate(sermon.sermon_date)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function EventsSection() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvents({ upcoming_only: true, limit: 5 })
      .then((res) => {
        const sorted = [...res.items].sort(
          (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
        );
        setEvents(sorted.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && events.length === 0) return null;

  return (
    <section id="evenements" className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>Calendrier</p>
          <h2 className={styles.sectionTitle}>Événements &amp; Formations</h2>
        </div>
        <Link page="evenements" className={styles.seeAllLink}>
          Voir tout →
        </Link>
      </div>

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <div className={styles.eventsGrid}>
          {events.map((evt) => (
            <button
              key={evt.id}
              className={styles.eventCard}
              onClick={() => navigate("evenements")}
            >
              {evt.image_url ? (
                <div className={styles.eventTop} style={{ backgroundImage: `url(${evt.image_url})` }}>
                  <span className={styles.eventDateDay}>{formatEventDay(evt.date_start)}</span>
                  <span className={styles.eventDateMonth}>{formatEventMonth(evt.date_start)}</span>
                </div>
              ) : (
                <div className={styles.eventTop}>
                  <span className={styles.eventDateDay}>{formatEventDay(evt.date_start)}</span>
                  <span className={styles.eventDateMonth}>{formatEventMonth(evt.date_start)}</span>
                </div>
              )}
              <div className={styles.eventBody}>
                <span className={styles.eventCategoryBadge}>{evt.category}</span>
                {evt.format === "en_ligne" && (
                  <span className={styles.eventCategoryBadge}>🌐 En ligne</span>
                )}
                {evt.format === "hybride" && (
                  <span className={styles.eventCategoryBadge}>🌐 Hybride</span>
                )}
                <p className={styles.eventCardTitle}>{evt.title}</p>
                {evt.format !== "en_ligne" && evt.location && (
                  <p className={styles.eventCardMeta}>📍 {evt.location}</p>
                )}
                {evt.instructor && (
                  <p className={styles.eventCardMeta}>👤 {evt.instructor}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function BlogSection() {
  const navigate = useNavigate();
  const { posts, loading, load } = usePosts();

  useEffect(() => {
    load({ limit: 3 });
  }, [load]);

  return (
    <section id="blog" className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>Lire</p>
          <h2 className={styles.sectionTitle}>Blog &amp; Articles</h2>
        </div>
        <Link page="blog" className={styles.seeAllLink}>
          Voir tout →
        </Link>
      </div>

      {loading ? (
        <p>Chargement…</p>
      ) : posts.length === 0 ? (
        <p>Aucun article publié pour le moment.</p>
      ) : (
        <div className={styles.blogGrid}>
          {posts.map((post, idx) => {
            const gradient =
              (post.category && CATEGORY_GRADIENT[post.category]) ||
              "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)";
            const isFeatured = idx === 0;
            return (
              <article
                key={post.id}
                className={`${styles.blogCard} ${isFeatured ? styles.blogCardFeatured : ""}`}
                onClick={() => navigate("blog", { postId: post.id })}
              >
                <div
                  className={`${styles.blogThumb} ${isFeatured ? styles.blogThumbFeatured : ""}`}
                  style={{ background: gradient }}
                >
                  {post.category && (
                    <span className={styles.blogTag}>{post.category}</span>
                  )}
                </div>
                <div className={styles.blogInfo}>
                  <p className={`${styles.blogTitle} ${isFeatured ? styles.blogTitleFeatured : ""}`}>
                    {post.title}
                  </p>
                  {post.excerpt && (
                    <p className={styles.blogExcerpt}>{post.excerpt}</p>
                  )}
                  <div className={styles.blogFooter}>
                    <span className={styles.blogMeta}>
                      {post.author} · {formatPostDate(post.created_at)}
                    </span>
                    <span className={styles.blogReadMore}>Lire →</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function HomePage() {
  return (
    <div className={styles.page}>
      <SiteHeader activePage="home" />
      <main>
        <Hero />
        <AboutSection />
        <SermonsSection />
        <EventsSection />
        <BlogSection />
      </main>
      <SiteFooter />
    </div>
  );
}
