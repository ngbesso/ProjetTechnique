import { useEffect, useState } from "react";
import styles from "../blog/BlogPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { useNavigate, useRouteParams } from "../../context/RouterContext";
import { useNews } from "../../hooks/useNews";
import { newsCoverUrl, fetchNewsItem, fetchNewsCategories } from "../../lib/api/news";
import type { News } from "../../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  Annonces:     { bg: "#d1fae5", text: "#065f46", gradient: "linear-gradient(135deg,#10b981 0%,#065f46 100%)" },
  Partenariats: { bg: "#dbeafe", text: "#1e40af", gradient: "linear-gradient(135deg,#3b82f6 0%,#1e40af 100%)" },
  Dons:         { bg: "#fef3c7", text: "#b45309", gradient: "linear-gradient(135deg,#f59e0b 0%,#b45309 100%)" },
  Jeunesse:     { bg: "#fce7f3", text: "#9d174d", gradient: "linear-gradient(135deg,#ec4899 0%,#9d174d 100%)" },
};
const DEFAULT_COLOR = { bg: "#ede9fe", text: "#5b21b6", gradient: "linear-gradient(135deg,#7c3aed 0%,#4c1d95 100%)" };

function getCategoryColor(cat: string | null) {
  return (cat && CATEGORY_COLORS[cat]) || DEFAULT_COLOR;
}

// ── Card ──────────────────────────────────────────────────────────────────────

function NewsCard({ item, onClick }: { item: News; onClick: () => void }) {
  const color = getCategoryColor(item.category);
  const cover = newsCoverUrl(item.cover_image_url);
  return (
    <article className={styles.card} onClick={onClick} tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}>
      <div
        className={styles.cardBanner}
        style={cover ? undefined : { background: color.gradient }}
      >
        {cover && <img src={cover} alt={item.title} className={styles.cardBannerImg} />}
        {item.category && (
          <span className={styles.cardCategoryBadge} style={{ color: color.text, background: color.bg }}>
            {item.category}
          </span>
        )}
      </div>
      <div className={styles.cardBody}>
        <h2 className={styles.cardTitle}>{item.title}</h2>
        {item.excerpt && <p className={styles.cardExcerpt}>{item.excerpt}</p>}
        <div className={styles.cardFooter}>
          <div className={styles.cardAuthorRow}>
            <span className={styles.authorAvatar}>{initials(item.author)}</span>
            <div>
              <p className={styles.authorName}>{item.author}</p>
              <p className={styles.cardDate}>{formatDate(item.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Detail ────────────────────────────────────────────────────────────────────

function NewsDetail({ newsId, onBack }: { newsId: number; onBack: () => void }) {
  const [item, setItem] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchNewsItem(newsId)
      .then(setItem)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [newsId]);

  if (loading) {
    return (
      <div className={styles.page}>
        <SiteHeader activePage="actualites" />
        <div className={styles.detailLoadingHero} />
        <main className={styles.detailBody}><p className={styles.stateMsg}>Chargement…</p></main>
        <SiteFooter />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className={styles.page}>
        <SiteHeader activePage="actualites" />
        <main className={styles.detailBody}>
          <button className={styles.backBtn} onClick={onBack}>← Retour aux actualités</button>
          <p className={styles.errorMsg}>{error || "Actualité introuvable."}</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const color = getCategoryColor(item.category);
  const cover = newsCoverUrl(item.cover_image_url);

  return (
    <div className={styles.page}>
      <SiteHeader activePage="actualites" />

      <div
        className={styles.detailHero}
        style={cover ? { backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: color.gradient }}
      >
        <div className={styles.detailHeroOverlay} />
        <div className={styles.detailHeroInner}>
          <button className={styles.detailBackBtn} onClick={onBack}>
            <span className={styles.detailBackArrow}>←</span> Actualités
          </button>
          {item.category && (
            <span className={styles.detailCategoryBadge} style={{ color: color.text, background: color.bg }}>
              {item.category}
            </span>
          )}
          <h1 className={styles.detailTitle}>{item.title}</h1>
          <div className={styles.detailHeroMeta}>
            <span>{formatDate(item.created_at)}</span>
          </div>
        </div>
      </div>

      <main className={styles.detailBody}>
        <div className={styles.authorStrip}>
          <span className={styles.authorAvatarLg}>{initials(item.author)}</span>
          <div>
            <p className={styles.authorStripName}>{item.author}</p>
            <p className={styles.authorStripDate}>{formatDate(item.created_at)}</p>
          </div>
        </div>

        <div
          className={styles.detailContent}
          dangerouslySetInnerHTML={{ __html: item.content.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>") }}
        />

        <div className={styles.detailDivider} />
        <button className={styles.detailBottomBack} onClick={onBack}>← Retour aux actualités</button>
      </main>

      <SiteFooter />
    </div>
  );
}

// ── List ──────────────────────────────────────────────────────────────────────

export function NewsPage() {
  const { news, total, loading, error, load } = useNews();
  const params = useRouteParams();
  const navigate = useNavigate();
  const selectedNewsId = typeof params.newsId === "number" ? params.newsId : null;
  const [filterQ, setFilterQ] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    load();
    fetchNewsCategories().then(setCategories).catch(() => {});
  }, [load]);

  if (selectedNewsId !== null) {
    return <NewsDetail newsId={selectedNewsId} onBack={() => navigate("actualites")} />;
  }

  function applyFilters(overrides?: { q?: string; category?: string }) {
    const q = overrides?.q ?? filterQ;
    const cat = overrides?.category ?? filterCategory;
    load({ q: q.trim() || undefined, category: cat || undefined });
  }

  return (
    <div className={styles.page}>
      <SiteHeader activePage="actualites" />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.heroEyebrow}>Actualités</p>
          <h1 className={styles.heroTitle}>Nos dernières actualités</h1>
          <p className={styles.heroSub}>
            Annonces, partenariats et nouvelles de nos Églises affiliées.
          </p>
          {total > 0 && <p className={styles.heroCount}>{total} actualité{total > 1 ? "s" : ""}</p>}
        </div>
        <div className={styles.heroDecor} aria-hidden />
      </section>

      <main className={styles.main}>
        <div className={styles.filterBar}>
          <div className={styles.filterSearch}>
            <span className={styles.filterSearchIcon}>🔍</span>
            <input
              className={styles.filterInput}
              placeholder="Rechercher…"
              value={filterQ}
              onChange={(e) => { setFilterQ(e.target.value); applyFilters({ q: e.target.value }); }}
            />
          </div>
          <div className={styles.categoryChips}>
            <button
              className={`${styles.chip} ${filterCategory === "" ? styles.chipActive : ""}`}
              onClick={() => { setFilterCategory(""); applyFilters({ category: "" }); }}
            >
              Toutes
            </button>
            {categories.map((c) => {
              const col = getCategoryColor(c);
              return (
                <button
                  key={c}
                  className={`${styles.chip} ${filterCategory === c ? styles.chipActive : ""}`}
                  style={filterCategory === c ? { background: col.gradient, color: "#fff", borderColor: "transparent" } : {}}
                  onClick={() => { setFilterCategory(c); applyFilters({ category: c }); }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {loading && (
          <div className={styles.skeletonGrid}>
            {[1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)}
          </div>
        )}
        {error && <p className={styles.errorMsg}>{error}</p>}
        {!loading && news.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyIcon}>📰</p>
            <p className={styles.emptyText}>Aucune actualité trouvée.</p>
          </div>
        )}

        {!loading && news.length > 0 && (
          <div className={styles.grid}>
            {news.map((item) => (
              <NewsCard key={item.id} item={item} onClick={() => navigate("actualites", { newsId: item.id })} />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
