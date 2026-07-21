import { useEffect, useState } from "react";
import styles from "./BlogPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useRouteParams } from "../../context/RouterContext";
import { usePosts } from "../../hooks/usePosts";
import { createComment, fetchComments } from "../../lib/api/comments";
import { coverUrl, fetchPost, fetchPostCategories } from "../../lib/api/posts";
import { fetchPublicSettings } from "../../lib/api/settings";
import type { BlogCommentsMode, Comment, Post } from "../../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function readTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  "Vie spirituelle": { bg: "#ede9fe", text: "#6d28d9", gradient: "linear-gradient(135deg,#6d28d9 0%,#4c1d95 100%)" },
  "Témoignage":      { bg: "#fef3c7", text: "#b45309", gradient: "linear-gradient(135deg,#f59e0b 0%,#b45309 100%)" },
  "Méditation":      { bg: "#cffafe", text: "#0e7490", gradient: "linear-gradient(135deg,#06b6d4 0%,#0e7490 100%)" },
  "Actualité":       { bg: "#d1fae5", text: "#065f46", gradient: "linear-gradient(135deg,#10b981 0%,#065f46 100%)" },
  "Réflexion":       { bg: "#fce7f3", text: "#9d174d", gradient: "linear-gradient(135deg,#ec4899 0%,#9d174d 100%)" },
};
const DEFAULT_COLOR = { bg: "#ede9fe", text: "#5b21b6", gradient: "linear-gradient(135deg,#7c3aed 0%,#4c1d95 100%)" };

function getCategoryColor(cat: string | null) {
  return (cat && CATEGORY_COLORS[cat]) || DEFAULT_COLOR;
}

// ── Card ──────────────────────────────────────────────────────────────────────

function PostCard({ post, onClick }: { post: Post; onClick: () => void }) {
  const color = getCategoryColor(post.category);
  const cover = coverUrl(post.cover_image_url);
  return (
    <article className={styles.card} onClick={onClick} tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}>
      <div
        className={styles.cardBanner}
        style={cover ? undefined : { background: color.gradient }}
      >
        {cover && <img src={cover} alt={post.title} className={styles.cardBannerImg} />}
        {post.category && (
          <span className={styles.cardCategoryBadge} style={{ color: color.text, background: color.bg }}>
            {post.category}
          </span>
        )}
      </div>
      <div className={styles.cardBody}>
        <h2 className={styles.cardTitle}>{post.title}</h2>
        {post.excerpt && <p className={styles.cardExcerpt}>{post.excerpt}</p>}
        <div className={styles.cardFooter}>
          <div className={styles.cardAuthorRow}>
            <span className={styles.authorAvatar}>{initials(post.author)}</span>
            <div>
              <p className={styles.authorName}>{post.author}</p>
              <p className={styles.cardDate}>{formatDate(post.created_at)}</p>
            </div>
          </div>
          <span className={styles.readTime}>{readTime(post.content)} de lecture</span>
        </div>
      </div>
    </article>
  );
}

// ── Commentaires ──────────────────────────────────────────────────────────────

function CommentsSection({ postId }: { postId: number }) {
  const { member } = useAuth();
  const [mode, setMode] = useState<BlogCommentsMode>("disabled");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPublicSettings()
      .then((s) => setMode((s.blog_comments_mode as BlogCommentsMode) || "disabled"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchComments(postId)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  if (mode === "disabled") return null;

  const isMember = !!member;
  const needsGuestFields = mode === "public" && !isMember;
  const blocked = mode === "members" && !isMember;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const created = await createComment(postId, {
        content: content.trim(),
        ...(needsGuestFields
          ? { author_name: guestName.trim(), author_email: guestEmail.trim() }
          : {}),
      });
      setComments((prev) => [...prev, created]);
      setContent("");
      setGuestName("");
      setGuestEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.commentsSection}>
      <h2 className={styles.commentsTitle}>
        Commentaires{comments.length > 0 ? ` (${comments.length})` : ""}
      </h2>

      {loading ? (
        <p className={styles.stateMsg}>Chargement…</p>
      ) : comments.length === 0 ? (
        <p className={styles.empty}>Aucun commentaire pour le moment.</p>
      ) : (
        <ul className={styles.commentsList}>
          {comments.map((c) => (
            <li key={c.id} className={styles.commentItem}>
              <span className={styles.commentAvatar}>{initials(c.author_name)}</span>
              <div className={styles.commentBody}>
                <div className={styles.commentMeta}>
                  <span className={styles.commentAuthor}>{c.author_name}</span>
                  <span className={styles.commentDate}>{formatDate(c.created_at)}</span>
                </div>
                <p className={styles.commentContent}>{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {blocked ? (
        <p className={styles.commentsNotice}>Connectez-vous en tant que membre pour commenter cet article.</p>
      ) : (
        <form className={styles.commentForm} onSubmit={handleSubmit}>
          {needsGuestFields && (
            <div className={styles.commentGuestFields}>
              <input
                className={styles.commentInput}
                placeholder="Votre nom"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
              />
              <input
                className={styles.commentInput}
                type="email"
                placeholder="Votre courriel"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
              />
            </div>
          )}
          <textarea
            className={styles.commentTextarea}
            placeholder="Votre commentaire…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            required
          />
          <button
            type="submit"
            className={styles.commentSubmit}
            disabled={submitting || !content.trim()}
          >
            {submitting ? "Envoi…" : "Publier"}
          </button>
          {error && <p className={styles.errorMsg} role="alert">{error}</p>}
        </form>
      )}
    </section>
  );
}

// ── Detail ────────────────────────────────────────────────────────────────────

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

  if (loading) {
    return (
      <div className={styles.page}>
        <SiteHeader activePage="blog" />
        <div className={styles.detailLoadingHero} />
        <main className={styles.detailBody}><p className={styles.stateMsg}>Chargement…</p></main>
        <SiteFooter />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={styles.page}>
        <SiteHeader activePage="blog" />
        <main className={styles.detailBody}>
          <button className={styles.backBtn} onClick={onBack}>← Retour au blog</button>
          <p className={styles.errorMsg}>{error || "Article introuvable."}</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const color = getCategoryColor(post.category);
  const cover = coverUrl(post.cover_image_url);

  return (
    <div className={styles.page}>
      <SiteHeader activePage="blog" />

      {/* Hero banner */}
      <div
        className={styles.detailHero}
        style={cover ? { backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: color.gradient }}
      >
        <div className={styles.detailHeroOverlay} />
        <div className={styles.detailHeroInner}>
          <button className={styles.detailBackBtn} onClick={onBack}>
            <span className={styles.detailBackArrow}>←</span> Blog
          </button>
          {post.category && (
            <span className={styles.detailCategoryBadge} style={{ color: color.text, background: color.bg }}>
              {post.category}
            </span>
          )}
          <h1 className={styles.detailTitle}>{post.title}</h1>
          <div className={styles.detailHeroMeta}>
            <span>{formatDate(post.created_at)}</span>
            <span className={styles.detailMetaDot}>·</span>
            <span>{readTime(post.content)} de lecture</span>
          </div>
        </div>
      </div>

      <main className={styles.detailBody}>
        {/* Author strip */}
        <div className={styles.authorStrip}>
          <span className={styles.authorAvatarLg}>{initials(post.author)}</span>
          <div>
            <p className={styles.authorStripName}>{post.author}</p>
            <p className={styles.authorStripDate}>{formatDate(post.created_at)}</p>
          </div>
        </div>

        {/* Content */}
        <div
          className={styles.detailContent}
          dangerouslySetInnerHTML={{ __html: post.content.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>") }}
        />

        <div className={styles.detailDivider} />
        <CommentsSection postId={post.id} />
        <button className={styles.detailBottomBack} onClick={onBack}>← Retour au blog</button>
      </main>

      <SiteFooter />
    </div>
  );
}

// ── List ──────────────────────────────────────────────────────────────────────

export function BlogPage() {
  const { posts, total, loading, error, load } = usePosts();
  const params = useRouteParams();
  const navigate = useNavigate();
  // L'article affiché vient de l'URL (/blog/:id) : lien partageable, F5 et retour navigateur OK
  const selectedPostId = typeof params.postId === "number" ? params.postId : null;
  const [filterQ, setFilterQ] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    load();
    fetchPostCategories().then(setCategories).catch(() => {});
  }, [load]);

  if (selectedPostId !== null) {
    return <PostDetail postId={selectedPostId} onBack={() => navigate("blog")} />;
  }

  function applyFilters(overrides?: { q?: string; category?: string }) {
    const q = overrides?.q ?? filterQ;
    const cat = overrides?.category ?? filterCategory;
    load({ q: q.trim() || undefined, category: cat || undefined });
  }

  return (
    <div className={styles.page}>
      <SiteHeader activePage="blog" />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.heroEyebrow}>Notre blog</p>
          <h1 className={styles.heroTitle}>Articles &amp; Réflexions</h1>
          <p className={styles.heroSub}>
            Actualités, témoignages et méditations de notre communauté.
          </p>
          {total > 0 && <p className={styles.heroCount}>{total} article{total > 1 ? "s" : ""}</p>}
        </div>
        <div className={styles.heroDecor} aria-hidden />
      </section>

      <main className={styles.main}>
        {/* Search + category chips */}
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
              Tous
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
        {!loading && posts.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyIcon}>📝</p>
            <p className={styles.emptyText}>Aucun article trouvé.</p>
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className={styles.grid}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onClick={() => navigate("blog", { postId: post.id })} />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
