import { useEffect, useState } from "react";
import styles from "./HomePage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { useSermons } from "../../hooks/useSermons";
import { useFormations } from "../../hooks/useFormations";
import { usePosts } from "../../hooks/usePosts";
import { registerToFormation } from "../../lib/api/formations";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import type { Formation, FormationRegistrationInput } from "../../types";

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

function formatFormationDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatFormationPrice(price: number): string {
  return price === 0
    ? "Gratuit"
    : price.toLocaleString("fr-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 2,
      });
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

const EVENT_TYPES = [
  { label: "Conférences & Congrès", subtype: "Rassemblements", icon: "🎤" },
  { label: "Colloque", subtype: "Échanges académiques", icon: "💬" },
  { label: "Croisade", subtype: "Évangélisation", icon: "✝" },
  { label: "Retraite", subtype: "Ressourcement spirituel", icon: "🌿" },
] as const;


// ── Sub-components ────────────────────────────────────────────────────────────



function Hero() {
  const navigate = useNavigate();
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
          <button className={styles.btnHeroPrimary} onClick={() => navigate("adhesion")}>
            Devenir membre
          </button>
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
        <button className={styles.seeAllLink} onClick={() => navigate("sermons")}>
          Voir tout →
        </button>
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
  return (
    <section id="evenements" className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>Calendrier</p>
          <h2 className={styles.sectionTitle}>Événements</h2>
        </div>
      </div>
      <div className={styles.eventsGrid}>
        {EVENT_TYPES.map((evt) => (
          <div key={evt.label} className={styles.eventCard}>
            <div className={styles.eventTop}>
              <span className={styles.eventIcon}>{evt.icon}</span>
            </div>
            <div className={styles.eventBody}>
              <p className={styles.eventType}>{evt.label}</p>
              <p className={styles.eventSubtype}>{evt.subtype}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const EMPTY_REGISTRATION: FormationRegistrationInput = {
  first_name: "",
  last_name: "",
  email: "",
};

function FormationSection() {
  const { member } = useAuth();
  const { formations, loading, load } = useFormations();

  const [registering, setRegistering] = useState<Formation | null>(null);
  const [regForm, setRegForm] = useState<FormationRegistrationInput>(EMPTY_REGISTRATION);
  const [regSaving, setRegSaving] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);

  useEffect(() => {
    load({ upcoming: true, available: true, limit: 6 });
  }, [load]);

  function openRegistration(f: Formation) {
    if (f.capacity - f.registered_count <= 0) return;
    setRegistering(f);
    setRegForm(
      member
        ? { first_name: member.first_name, last_name: member.last_name, email: member.email }
        : EMPTY_REGISTRATION,
    );
    setRegError("");
    setRegSuccess(false);
  }

  function closeRegistration() {
    setRegistering(null);
    setRegForm(EMPTY_REGISTRATION);
    setRegError("");
    setRegSuccess(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!registering) return;
    if (!regForm.first_name.trim() || !regForm.last_name.trim() || !regForm.email.trim()) {
      setRegError("Tous les champs sont requis.");
      return;
    }
    setRegSaving(true);
    setRegError("");
    try {
      await registerToFormation(registering.id, {
        first_name: regForm.first_name.trim(),
        last_name: regForm.last_name.trim(),
        email: regForm.email.trim(),
      });
      setRegSuccess(true);
      load({ upcoming: true, available: true, limit: 6 });
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setRegSaving(false);
    }
  }

  return (
    <section id="formation" className={`${styles.section} ${styles.sectionAlt}`}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>Grandir</p>
          <h2 className={styles.sectionTitle}>Formations à venir</h2>
        </div>
      </div>

      {loading ? (
        <p>Chargement…</p>
      ) : formations.length === 0 ? (
        <p>Aucune formation programmée pour le moment.</p>
      ) : (
        <div className={styles.formationsGrid}>
          {formations.map((f) => {
            const placesLeft = f.capacity - f.registered_count;
            const isFull = placesLeft <= 0;
            return (
              <article key={f.id} className={styles.formationCard}>
                <div className={styles.formationCardTop}>
                  <span className={styles.formationPrice}>{formatFormationPrice(f.price)}</span>
                  <span className={isFull ? styles.formationPlacesFull : styles.formationPlaces}>
                    {isFull ? "Complet" : `${placesLeft} place${placesLeft > 1 ? "s" : ""} restante${placesLeft > 1 ? "s" : ""}`}
                  </span>
                </div>
                <p className={styles.formationCardTitle}>{f.title}</p>
                <p className={styles.formationCardMeta}>
                  👤 {f.instructor}
                </p>
                <p className={styles.formationCardMeta}>
                  📅 {formatFormationDate(f.formation_date)}
                </p>
                {f.description && (
                  <p className={styles.formationCardDesc}>{f.description}</p>
                )}
                <button
                  className={styles.btnPrimary}
                  disabled={isFull}
                  style={{ marginTop: "auto", opacity: isFull ? 0.5 : 1 }}
                  onClick={() => openRegistration(f)}
                >
                  {isFull ? "Complet" : "S'inscrire"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {registering && (
        <div className={styles.formationModalOverlay} onClick={closeRegistration}>
          <div className={styles.formationModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formationModalHeader}>
              <div>
                <p className={styles.formationModalTitle}>{registering.title}</p>
                <p className={styles.formationModalSub}>
                  {registering.instructor} · {formatFormationDate(registering.formation_date)} · {formatFormationPrice(registering.price)}
                </p>
              </div>
              <button
                className={styles.formationModalClose}
                onClick={closeRegistration}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {regSuccess ? (
              <div className={styles.formationModalBody}>
                <p className={styles.formationSuccess}>
                  ✓ Inscription confirmée ! Nous vous attendons le{" "}
                  {formatFormationDate(registering.formation_date)}.
                </p>
                <div className={styles.formationModalActions}>
                  <button className={styles.btnPrimary} onClick={closeRegistration}>
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <form className={styles.formationModalBody} onSubmit={handleRegister}>
                <div className={styles.formationFormGrid}>
                  <input
                    className={styles.formationInput}
                    placeholder="Prénom *"
                    required
                    value={regForm.first_name}
                    onChange={(e) => setRegForm({ ...regForm, first_name: e.target.value })}
                  />
                  <input
                    className={styles.formationInput}
                    placeholder="Nom *"
                    required
                    value={regForm.last_name}
                    onChange={(e) => setRegForm({ ...regForm, last_name: e.target.value })}
                  />
                  <input
                    className={styles.formationInput}
                    type="email"
                    placeholder="Courriel *"
                    required
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  />
                </div>
                {regError && (
                  <p className={styles.formationError} role="alert">⚠ {regError}</p>
                )}
                <div className={styles.formationModalActions}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={closeRegistration}
                    disabled={regSaving}
                  >
                    Annuler
                  </button>
                  <button type="submit" className={styles.btnPrimary} disabled={regSaving}>
                    {regSaving ? "Inscription…" : "Confirmer mon inscription"}
                  </button>
                </div>
              </form>
            )}
          </div>
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
        <button className={styles.seeAllLink} onClick={() => navigate("blog")}>
          Voir tout →
        </button>
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

function DonationBand() {
  const navigate = useNavigate();
  return (
    <section className={styles.donationBand}>
      <div className={styles.donationContent}>
        <h2 className={styles.donationTitle}>Soutenir la mission</h2>
        <p className={styles.donationDesc}>
          Votre don soutient les Églises locales, les programmes de formation et les
          actions d'évangélisation
        </p>
      </div>
      <button
        className={styles.btnOutlineWhite}
        onClick={() => navigate("donation")}
      >
        ♥ Faire un don
      </button>
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
        <FormationSection />
        <BlogSection />
        <DonationBand />
      </main>
      <SiteFooter />
    </div>
  );
}
