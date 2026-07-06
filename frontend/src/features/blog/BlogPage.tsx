import { useEffect, useState } from "react";
import styles from "./BlogPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { useRouteParams } from "../../context/RouterContext";
import { usePosts } from "../../hooks/usePosts";
import { fetchPost, fetchPostCategories } from "../../lib/api/posts";
import type { Post } from "../../types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function PostDetail({ postId, onBack }: { postId: number; onBack: () => void }) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchPost(postId)
      .then(setPost)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [postId]);

  return (
    <div className={styles.page}>
      <SiteHeader activePage="blog" />
      <main className={styles.detailMain}>
        <button className={styles.backBtn} onClick={onBack}>
          ← Retour au blog
        </button>
        {loading && <p className={styles.stateMsg}>Chargement…</p>}
        {error && <p className={styles.errorMsg}>{error}</p>}
        {post && (
          <article className={styles.article}>
            {post.cover_image_url && (
              <img
                className={styles.coverImg}
                src={post.cover_image_url}
                alt={post.title}
              />
            )}
            <div className={styles.articleMeta}>
              {post.category && (
                <span className={styles.categoryBadge}>{post.category}</span>
              )}
              <span className={styles.articleDate}>{formatDate(post.created_at)}</span>
            </div>
            <h1 className={styles.articleTitle}>{post.title}</h1>
            <p className={styles.articleAuthor}>Par {post.author}</p>
            <div
              className={styles.articleContent}
              dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, "<br/>") }}
            />
          </article>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

export function BlogPage() {
  const { posts, total, loading, error, load } = usePosts();
  const params = useRouteParams();
  const [selectedPostId, setSelectedPostId] = useState<number | null>(
    typeof params.postId === "number" ? params.postId : null,
  );
  const [filterQ, setFilterQ] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    load();
    fetchPostCategories().then(setCategories).catch(() => {});
  }, [load]);

  if (selectedPostId !== null) {
    return (
      <PostDetail postId={selectedPostId} onBack={() => setSelectedPostId(null)} />
    );
  }

  function applyFilters(overrides?: { q?: string; category?: string }) {
    const q = overrides?.q ?? filterQ;
    const category = overrides?.category ?? filterCategory;
    load({ q: q.trim() || undefined, category: category || undefined });
  }

  return (
    <div className={styles.page}>
      <SiteHeader activePage="blog" />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>Notre blog</span>
          <h1 className={styles.heroTitle}>Articles & Réflexions</h1>
          <p className={styles.heroSub}>
            Actualités, témoignages et méditations de notre communauté.
          </p>
        </div>
      </section>

      <main className={styles.main}>
        <div className={styles.filters}>
          <input
            className={styles.filterInput}
            placeholder="Rechercher un article…"
            value={filterQ}
            onChange={(e) => {
              setFilterQ(e.target.value);
              applyFilters({ q: e.target.value });
            }}
          />
          {categories.length > 0 && (
            <select
              className={styles.filterSelect}
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                applyFilters({ category: e.target.value });
              }}
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {loading && <p className={styles.stateMsg}>Chargement…</p>}
        {error && <p className={styles.errorMsg}>{error}</p>}

        {!loading && posts.length === 0 && (
          <p className={styles.empty}>Aucun article publié pour l'instant.</p>
        )}

        <div className={styles.grid}>
          {posts.map((post) => (
            <article
              key={post.id}
              className={styles.card}
              onClick={() => setSelectedPostId(post.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSelectedPostId(post.id)}
            >
              {post.cover_image_url && (
                <img
                  className={styles.cardCover}
                  src={post.cover_image_url}
                  alt={post.title}
                />
              )}
              <div className={styles.cardBody}>
                <div className={styles.cardMeta}>
                  {post.category && (
                    <span className={styles.categoryBadge}>{post.category}</span>
                  )}
                  <span className={styles.cardDate}>{formatDate(post.created_at)}</span>
                </div>
                <h2 className={styles.cardTitle}>{post.title}</h2>
                {post.excerpt && (
                  <p className={styles.cardExcerpt}>{post.excerpt}</p>
                )}
                <div className={styles.cardFooter}>
                  <span className={styles.cardAuthor}>Par {post.author}</span>
                  <span className={styles.readMore}>Lire →</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {total > posts.length && (
          <p className={styles.totalHint}>{total} articles au total</p>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
