import { useEffect, useState } from "react";
import styles from "./DonationPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { fetchChurches } from "../../lib/api/churches";
import { fetchParameters } from "../../lib/api/parameters";
import type { Church, ParameterValue } from "../../types";

const ZEFFY_EMBED_PATH = import.meta.env.VITE_ZEFFY_EMBED_PATH as string | undefined;

export function DonationPage() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [categories, setCategories] = useState<ParameterValue[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ParameterValue | null>(null);
  const [loadingChurches, setLoadingChurches] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);

  useEffect(() => {
    fetchChurches()
      .then((list) => {
        setChurches(list);
        if (list.length === 1) setSelectedChurch(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingChurches(false));

    fetchParameters("donation_category")
      .then((list) => {
        setCategories(list);
        if (list.length === 1) setSelectedCategory(list[0]);
      })
      .catch(() => setCategoriesError(true))
      .finally(() => setLoadingCategories(false));
  }, []);

  // Zeffy est visible dès que l'église est choisie ET (catégorie choisie OU pas de catégories disponibles)
  const showZeffy = !!selectedChurch && (!!selectedCategory || categoriesError || (!loadingCategories && categories.length === 0));


  return (
    <div className={styles.page}>
      <SiteHeader activePage="donation" />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>♥ Faire un don</span>
          <h1 className={styles.heroTitle}>Soutenir notre mission</h1>
          <p className={styles.heroSubtitle}>
            Chaque don contribue à avancer la mission et à renforcer notre
            communauté.
          </p>
        </div>
      </section>

      <main className={styles.main}>
        <div className={styles.formCard}>

          {/* ── Étape 1 : église ── */}
          <div className={styles.step}>
            <span className={styles.stepNumber}>1</span>
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>Choisissez votre église</h2>

              {loadingChurches ? (
                <p className={styles.stateMsg}>Chargement…</p>
              ) : churches.length === 0 ? (
                <p className={styles.stateMsg}>Aucune église disponible.</p>
              ) : (
                <div className={styles.churchGrid}>
                  {churches.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`${styles.churchCard} ${selectedChurch?.id === c.id ? styles.cardSelected : ""}`}
                      onClick={() => setSelectedChurch(c)}
                    >
                      <span className={styles.cardIcon}>⛪</span>
                      <span className={styles.cardLabel}>{c.name}</span>
                      {c.address && (
                        <span className={styles.cardSub}>{c.address}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Étape 2 : catégorie ── */}
          {selectedChurch && (
            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <div className={styles.stepBody}>
                <h2 className={styles.stepTitle}>Choisissez une catégorie</h2>
                {loadingCategories ? (
                  <p className={styles.stateMsg}>Chargement…</p>
                ) : categories.length === 0 ? (
                  <p className={styles.stateMsg}>Aucune catégorie disponible.</p>
                ) : (
                  <div className={styles.categoryGrid}>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`${styles.categoryCard} ${selectedCategory?.id === cat.id ? styles.cardSelected : ""}`}
                        onClick={() => setSelectedCategory(cat)}
                      >
                        <span className={styles.cardLabel}>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Étape 3 : formulaire Zeffy ── */}
          {showZeffy && (
            <div className={styles.step}>
              <span className={styles.stepNumber}>{categories.length > 0 && !categoriesError ? "3" : "2"}</span>
              <div className={styles.stepBody}>
                <h2 className={styles.stepTitle}>
                  Don pour{" "}
                  <span style={{ color: "var(--deep-violet)" }}>{selectedChurch!.name}</span>
                  {selectedCategory && (
                    <>{" · "}<span style={{ color: "var(--deep-violet)" }}>{selectedCategory.label}</span></>
                  )}
                </h2>
                <p className={styles.stepSubtitle}>
                  Votre paiement est traité de façon sécurisée par{" "}
                  <strong>Zeffy</strong>. Un reçu fiscal vous sera envoyé
                  automatiquement par courriel.
                </p>

                {ZEFFY_EMBED_PATH ? (
                  <div className={styles.zeffyWrapper}>
                    <iframe
                      key={`${selectedChurch!.id}-${selectedCategory?.id ?? 0}`}
                      title="Formulaire de don Zeffy"
                      src={`https://www.zeffy.com${ZEFFY_EMBED_PATH}`}
                      className={styles.zeffyEmbed}
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className={styles.notConfigured}>
                    <p>Le formulaire de don n'est pas encore configuré.</p>
                  </div>
                )}

                <div className={styles.badges}>
                  <span className={styles.badge}>🔒 Paiement sécurisé (Zeffy)</span>
                  <span className={styles.badge}>📄 Reçu fiscal par courriel</span>
                  <span className={styles.badge}>✓ Aucun compte requis</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
