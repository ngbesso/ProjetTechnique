import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { usePosts } from "../../hooks/usePosts";
import { fetchPostCategories } from "../../lib/api/posts";
import type { Post, PostInput, PostStatus } from "../../types";

const EMPTY: PostInput = {
  title: "",
  content: "",
  excerpt: "",
  author: "",
  status: "draft",
  category: "",
  cover_image_url: "",
};

const STATUS_LABELS: Record<PostStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function BlogPanel() {
  const { user } = useAuth();
  const { posts, loading, error, loadAdmin, add, edit, remove } = usePosts();
  const [form, setForm] = useState<PostInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editForm, setEditForm] = useState<PostInput>(EMPTY);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  const canManage =
    user?.permissions.includes("*") || user?.permissions.includes("post:manage");

  useEffect(() => {
    loadAdmin();
    fetchPostCategories().then(setCategories).catch(() => {});
  }, [loadAdmin]);

  function applyFilters(overrides?: Record<string, string>) {
    const q = overrides?.q ?? filterQ;
    const status = overrides?.status ?? filterStatus;
    const category = overrides?.category ?? filterCategory;
    loadAdmin({
      q: q.trim() || undefined,
      status: status || undefined,
      category: category || undefined,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim() || !form.author.trim()) {
      setFormError("Titre, contenu et auteur sont requis.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await add({
        ...form,
        excerpt: form.excerpt?.trim() || undefined,
        category: form.category?.trim() || undefined,
        cover_image_url: form.cover_image_url?.trim() || undefined,
      });
      setForm(EMPTY);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(p: Post) {
    setEditingPost(p);
    setEditForm({
      title: p.title,
      content: p.content,
      excerpt: p.excerpt ?? "",
      author: p.author,
      status: p.status,
      category: p.category ?? "",
      cover_image_url: p.cover_image_url ?? "",
    });
    setEditError("");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPost) return;
    if (!editForm.title.trim() || !editForm.content.trim() || !editForm.author.trim()) {
      setEditError("Titre, contenu et auteur sont requis.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      await edit(editingPost.id, {
        title: editForm.title,
        content: editForm.content,
        excerpt: editForm.excerpt?.trim() || undefined,
        author: editForm.author,
        status: editForm.status,
        category: editForm.category?.trim() || undefined,
        cover_image_url: editForm.cover_image_url?.trim() || undefined,
      });
      setEditingPost(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleStatusChange(id: number, status: PostStatus) {
    try {
      await edit(id, { status });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Mise à jour impossible");
    }
  }

  async function handleDelete(id: number, title: string) {
    if (!confirm(`Supprimer l'article « ${title} » ?`)) return;
    try {
      await remove(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Suppression impossible");
    }
  }

  if (loading) return <p className={styles.stateMsg}>Chargement…</p>;

  return (
    <div className={styles.rbacWrapper}>
      {error && <p className={styles.errorMsg} role="alert">{error}</p>}

      {canManage && (
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Nouvel article</h3>
          <form onSubmit={handleSubmit} className={styles.formGrid}>
            <input
              className={styles.input}
              placeholder="Titre *"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              className={styles.input}
              placeholder="Auteur *"
              required
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
            <input
              className={styles.input}
              placeholder="Catégorie (optionnel)"
              value={form.category ?? ""}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <input
              className={styles.input}
              placeholder="URL image de couverture (optionnel)"
              value={form.cover_image_url ?? ""}
              onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
            />
            <select
              className={styles.select}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as PostStatus })}
            >
              {(Object.keys(STATUS_LABELS) as PostStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <textarea
              className={styles.input}
              placeholder="Résumé / extrait (optionnel)"
              rows={2}
              value={form.excerpt ?? ""}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
            <textarea
              className={styles.input}
              placeholder="Contenu complet *"
              rows={6}
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              style={{ gridColumn: "1 / -1" }}
            />
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Enregistrement…" : "+ Publier"}
            </button>
          </form>
          {formError && (
            <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>
              {formError}
            </p>
          )}
        </section>
      )}

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Articles ({posts.length})</h3>

        <div className={styles.inlineForm} style={{ flexWrap: "wrap", marginBottom: "1rem", gap: "0.5rem" }}>
          <input
            className={styles.input}
            placeholder="Rechercher…"
            value={filterQ}
            style={{ flex: "1 1 160px" }}
            onChange={(e) => { setFilterQ(e.target.value); applyFilters({ q: e.target.value }); }}
          />
          <select
            className={styles.select}
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); applyFilters({ status: e.target.value }); }}
          >
            <option value="">Tous statuts</option>
            {(Object.keys(STATUS_LABELS) as PostStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); applyFilters({ category: e.target.value }); }}
          >
            <option value="">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {posts.length === 0 ? (
          <p className={styles.empty}>Aucun article.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Titre</th>
                <th className={styles.th}>Auteur</th>
                <th className={styles.th}>Catégorie</th>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Statut</th>
                {canManage && <th className={styles.th}></th>}
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td className={styles.td}><strong>{p.title}</strong></td>
                  <td className={styles.td}>{p.author}</td>
                  <td className={styles.td}>{p.category ?? "—"}</td>
                  <td className={styles.td}>{formatDate(p.created_at)}</td>
                  <td className={styles.td}>
                    {canManage ? (
                      <select
                        className={styles.select}
                        value={p.status}
                        onChange={(e) => handleStatusChange(p.id, e.target.value as PostStatus)}
                      >
                        {(Object.keys(STATUS_LABELS) as PostStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    ) : (
                      STATUS_LABELS[p.status]
                    )}
                  </td>
                  {canManage && (
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        <button className={styles.btnOutlineSm} onClick={() => openEdit(p)}>
                          Modifier
                        </button>
                        <button className={styles.btnDanger} onClick={() => handleDelete(p.id, p.title)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {editingPost && (
        <div className={styles.modalOverlay} onClick={() => setEditingPost(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px" }}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalName}>Modifier l'article</h2>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {editingPost.title}
                </span>
              </div>
              <button className={styles.modalClose} onClick={() => setEditingPost(null)} aria-label="Fermer">
                ✕
              </button>
            </div>

            <form id="editPostForm" onSubmit={handleEditSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <input
                    className={styles.input}
                    placeholder="Titre *"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    placeholder="Auteur *"
                    required
                    value={editForm.author}
                    onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    placeholder="Catégorie"
                    value={editForm.category ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    placeholder="URL image de couverture"
                    value={editForm.cover_image_url ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, cover_image_url: e.target.value })}
                  />
                  <select
                    className={styles.select}
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as PostStatus })}
                  >
                    {(Object.keys(STATUS_LABELS) as PostStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <textarea
                    className={styles.input}
                    placeholder="Résumé / extrait"
                    rows={2}
                    value={editForm.excerpt ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, excerpt: e.target.value })}
                  />
                  <textarea
                    className={styles.input}
                    placeholder="Contenu complet *"
                    rows={8}
                    required
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    style={{ gridColumn: "1 / -1" }}
                  />
                </div>
                {editError && (
                  <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>
                    {editError}
                  </p>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => setEditingPost(null)}
                  disabled={editSaving}
                >
                  Annuler
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={editSaving}>
                  {editSaving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
