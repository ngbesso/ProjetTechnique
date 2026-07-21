import { useEffect, useRef, useState } from "react";
import styles from "./AdminPage.module.css";
import coverStyles from "./BlogPanel.module.css";
import { useAuth } from "../../context/AuthContext";
import { usePosts } from "../../hooks/usePosts";
import { useConfirm } from "../../hooks/useConfirm";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import { fetchPostCategories, fetchPostsStats, uploadPostCover, deletePostCover, coverUrl } from "../../lib/api/posts";
import { fetchComments, deleteComment } from "../../lib/api/comments";
import { KpiCard } from "../../components/ui/KpiCard";
import type { Comment, Post, PostAdminStats, PostInput, PostStatus } from "../../types";

// ── Icônes KPI ────────────────────────────────────────────────────────────────

function IconCheckCircle() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="8 12 11 15 16 9" />
    </svg>
  );
}

function IconFileEdit() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 18l4-4-1.5-1.5L10.5 16.5V18H12z" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const EMPTY: PostInput = {
  title: "",
  content: "",
  excerpt: "",
  author: "",
  status: "draft",
  category: "",
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

// ── CoverUpload — zone de dépôt / prévisualisation ────────────────────────────

interface CoverUploadProps {
  currentUrl?: string | null;
  onFileChange: (file: File | null) => void;
  onRemove?: () => void;
  previewFile: File | null;
}

function CoverUpload({ currentUrl, onFileChange, onRemove, previewFile }: CoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const resolvedCurrent = coverUrl(currentUrl);
  const preview = previewFile ? URL.createObjectURL(previewFile) : resolvedCurrent;

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    onFileChange(file);
  }

  return (
    <div className={coverStyles.coverZone} style={{ gridColumn: "1 / -1" }}>
      <label className={coverStyles.coverLabel}>Image de couverture (optionnel)</label>

      {preview ? (
        <div className={coverStyles.previewWrap}>
          <img src={preview} alt="Aperçu couverture" className={coverStyles.previewImg} />
          <div className={coverStyles.previewActions}>
            <button type="button" className={coverStyles.previewBtn}
              onClick={() => inputRef.current?.click()}>
              Changer
            </button>
            {(previewFile || resolvedCurrent) && onRemove && (
              <button type="button" className={`${coverStyles.previewBtn} ${coverStyles.previewBtnDanger}`}
                onClick={() => { onFileChange(null); onRemove(); }}>
                Supprimer
              </button>
            )}
            {previewFile && !resolvedCurrent && (
              <button type="button" className={`${coverStyles.previewBtn} ${coverStyles.previewBtnDanger}`}
                onClick={() => { onFileChange(null); }}>
                Annuler
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`${coverStyles.dropZone} ${dragOver ? coverStyles.dropZoneDrag : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        >
          <span className={coverStyles.dropIcon}>🖼</span>
          <p className={coverStyles.dropText}>Glisser une image ici ou <span>cliquer pour parcourir</span></p>
          <p className={coverStyles.dropHint}>JPG, PNG, WebP — recommandé : 1200 × 630 px</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────────────────────────

const col = createColumnHelper<Post>();

export function BlogPanel() {
  const { user } = useAuth();
  const { posts, loading, error, loadAdmin, add, edit, remove } = usePosts();
  const { confirm, dialog } = useConfirm();

  // Create form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<PostInput>(EMPTY);
  const [createCover, setCreateCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit modal
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editForm, setEditForm] = useState<PostInput>(EMPTY);
  const [editCover, setEditCover] = useState<File | null>(null);
  const [removeEditCover, setRemoveEditCover] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editComments, setEditComments] = useState<Comment[]>([]);
  const [editCommentsLoading, setEditCommentsLoading] = useState(false);

  // Filters
  const [filterQ, setFilterQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<PostAdminStats | null>(null);

  const canManage =
    user?.permissions.includes("*") || user?.permissions.includes("post:manage");

  useEffect(() => {
    loadAdmin();
    fetchPostCategories().then(setCategories).catch(() => {});
    fetchPostsStats().then(setStats).catch(() => {});
  }, [loadAdmin]);

  function applyFilters(overrides?: Record<string, string>) {
    const q = overrides?.q ?? filterQ;
    const status = overrides?.status ?? filterStatus;
    const category = overrides?.category ?? filterCategory;
    loadAdmin({ q: q.trim() || undefined, status: status || undefined, category: category || undefined });
  }

  function openCreateModal() {
    setForm(EMPTY);
    setCreateCover(null);
    setFormError("");
    setShowCreateModal(true);
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
      const created = await add({
        ...form,
        excerpt: form.excerpt?.trim() || undefined,
        category: form.category?.trim() || undefined,
      });
      if (createCover) {
        await uploadPostCover(created.id, createCover);
      }
      setForm(EMPTY);
      setCreateCover(null);
      setShowCreateModal(false);
      loadAdmin();
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
    });
    setEditCover(null);
    setRemoveEditCover(false);
    setEditError("");
    setEditComments([]);
    setEditCommentsLoading(true);
    fetchComments(p.id)
      .then(setEditComments)
      .catch(() => setEditComments([]))
      .finally(() => setEditCommentsLoading(false));
  }

  async function handleDeleteComment(commentId: number, authorName: string) {
    if (!editingPost) return;
    const ok = await confirm({
      title: `Supprimer le commentaire de « ${authorName} » ?`,
      description: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteComment(editingPost.id, commentId);
      setEditComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Suppression impossible");
    }
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
      });
      if (editCover) {
        await uploadPostCover(editingPost.id, editCover);
      } else if (removeEditCover && editingPost.cover_image_url) {
        await deletePostCover(editingPost.id);
      }
      setEditingPost(null);
      loadAdmin();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleStatusChange(id: number, status: PostStatus) {
    try { await edit(id, { status }); }
    catch (err) { alert(err instanceof Error ? err.message : "Mise à jour impossible"); }
  }

  async function handleDelete(id: number, title: string) {
    const ok = await confirm({
      title: `Supprimer l'article « ${title} » ?`,
      description: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try { await remove(id); }
    catch (err) { alert(err instanceof Error ? err.message : "Suppression impossible"); }
  }

  const columns = [
    col.display({
      id: "cover",
      header: "Couverture",
      cell: (info) => {
        const p = info.row.original;
        const url = coverUrl(p.cover_image_url);
        return url ? (
          <img src={url} alt="" className={coverStyles.thumbImg} />
        ) : (
          <div className={coverStyles.thumbPlaceholder}>—</div>
        );
      },
    }),
    col.accessor("title", {
      header: "Titre",
      cell: (info) => <strong>{info.getValue()}</strong>,
    }),
    col.accessor("author", { header: "Auteur" }),
    col.accessor("created_at", {
      header: "Date",
      cell: (info) => formatDate(info.getValue()),
    }),
    col.accessor("status", {
      header: "Statut",
      cell: (info) => {
        const p = info.row.original;
        return canManage ? (
          <select className={styles.select} value={p.status}
            onChange={(e) => handleStatusChange(p.id, e.target.value as PostStatus)}>
            {(Object.keys(STATUS_LABELS) as PostStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        ) : STATUS_LABELS[p.status];
      },
    }),
    ...(canManage
      ? [
          col.display({
            id: "actions",
            header: "",
            cell: (info) => {
              const p = info.row.original;
              return (
                <div className={styles.actions}>
                  <button className={styles.btnOutlineSm} onClick={() => openEdit(p)}>Modifier</button>
                  <button className={styles.btnDanger} onClick={() => handleDelete(p.id, p.title)}>Supprimer</button>
                </div>
              );
            },
          }),
        ]
      : []),
  ];

  if (loading) return <p className={styles.stateMsg}>Chargement…</p>;

  return (
    <div className={styles.rbacWrapper}>
      {error && <p className={styles.errorMsg} role="alert">{error}</p>}

      {stats && (
        <>
          <div className={styles.kpiGrid}>
            <KpiCard color="emerald" icon={<IconCheckCircle />} value={stats.published} label="Publiés" />
            <KpiCard color="amber" icon={<IconFileEdit />} value={stats.draft} label="Brouillons" />
            <KpiCard color="violet" icon={<IconEye />} value={stats.total_views} label="Total des vues" />
          </div>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Top 5 des articles les plus lus</h3>
            {stats.top_posts.length === 0 ? (
              <p className={styles.empty}>Aucun article enregistré.</p>
            ) : (
              stats.top_posts.map((p, i) => (
                <div key={p.id} className={styles.topListRow}>
                  <span className={i === 0 ? `${styles.topListRank} ${styles.topListRankFirst}` : styles.topListRank}>
                    {i + 1}
                  </span>
                  <div className={styles.topListBody}>
                    <span className={styles.topListName}>{p.title}</span>
                    <span className={styles.topListValue}>{p.views} vue{p.views > 1 ? "s" : ""} · {p.author}</span>
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}

      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          {canManage && (
            <button type="button" className={styles.btnPrimary} onClick={openCreateModal}>
              + Nouvel article
            </button>
          )}
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>Articles ({posts.length})</h3>
        </div>
        <div className={styles.filterBar}>
          <input className={styles.input} placeholder="Rechercher…" value={filterQ}
            style={{ flex: "1 1 160px" }}
            onChange={(e) => { setFilterQ(e.target.value); applyFilters({ q: e.target.value }); }} />
          <select className={styles.select} value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); applyFilters({ status: e.target.value }); }}>
            <option value="">Tous statuts</option>
            {(Object.keys(STATUS_LABELS) as PostStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select className={styles.select} value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); applyFilters({ category: e.target.value }); }}>
            <option value="">Toutes catégories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className={styles.listBody}>
          <DataTable
            columns={columns}
            data={posts}
            getRowId={(p) => p.id}
            emptyMessage="Aucun article."
          />
        </div>
      </section>

      {/* ── Modale création ── */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "780px" }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderIcon}>📝</div>
              <div className={styles.modalHeaderText}>
                <h2 className={styles.modalName}>Nouvel article</h2>
                <span className={styles.modalSubtitle}>Remplissez les informations du nouvel article.</span>
              </div>
              <button className={styles.modalClose} onClick={() => setShowCreateModal(false)} aria-label="Fermer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <input className={styles.input} placeholder="Titre *" required
                    value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  <input className={styles.input} placeholder="Auteur *" required
                    value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                  <input className={styles.input} placeholder="Catégorie (optionnel)"
                    value={form.category ?? ""}
                    onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  <select className={styles.select} value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as PostStatus })}>
                    {(Object.keys(STATUS_LABELS) as PostStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <textarea className={styles.input} placeholder="Résumé / extrait (optionnel)"
                    rows={2} value={form.excerpt ?? ""}
                    onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
                  <textarea className={styles.input} placeholder="Contenu complet *"
                    rows={6} required value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    style={{ gridColumn: "1 / -1" }} />
                  <CoverUpload
                    previewFile={createCover}
                    onFileChange={setCreateCover}
                  />
                </div>
                {formError && (
                  <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>{formError}</p>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnGhost}
                  onClick={() => setShowCreateModal(false)} disabled={saving}>
                  Annuler
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? "Enregistrement…" : "+ Publier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale édition ── */}
      {editingPost && (
        <div className={styles.modalOverlay} onClick={() => setEditingPost(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "780px" }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderIcon}>✏️</div>
              <div className={styles.modalHeaderText}>
                <h2 className={styles.modalName}>Modifier l'article</h2>
                <span className={styles.modalSubtitle}>{editingPost.title}</span>
              </div>
              <button className={styles.modalClose} onClick={() => setEditingPost(null)} aria-label="Fermer">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className={styles.modalForm}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <input className={styles.input} placeholder="Titre *" required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                  <input className={styles.input} placeholder="Auteur *" required
                    value={editForm.author}
                    onChange={(e) => setEditForm({ ...editForm, author: e.target.value })} />
                  <input className={styles.input} placeholder="Catégorie"
                    value={editForm.category ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
                  <select className={styles.select} value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as PostStatus })}>
                    {(Object.keys(STATUS_LABELS) as PostStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <textarea className={styles.input} placeholder="Résumé / extrait" rows={2}
                    value={editForm.excerpt ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, excerpt: e.target.value })} />
                  <textarea className={styles.input} placeholder="Contenu complet *" rows={8} required
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    style={{ gridColumn: "1 / -1" }} />
                  <CoverUpload
                    currentUrl={removeEditCover ? null : editingPost.cover_image_url}
                    previewFile={editCover}
                    onFileChange={(f) => { setEditCover(f); if (!f) setRemoveEditCover(false); }}
                    onRemove={() => { setRemoveEditCover(true); setEditCover(null); }}
                  />
                </div>
                {editError && (
                  <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>{editError}</p>
                )}

                <div style={{ marginTop: "1.5rem", borderTop: "1px solid #ede9fe", paddingTop: "1rem" }}>
                  <h4 style={{ margin: "0 0 0.75rem", fontSize: ".9rem", fontWeight: 700, color: "var(--text-main)" }}>
                    Commentaires {editComments.length > 0 && `(${editComments.length})`}
                  </h4>
                  {editCommentsLoading ? (
                    <p className={styles.stateMsg}>Chargement…</p>
                  ) : editComments.length === 0 ? (
                    <p className={styles.empty}>Aucun commentaire sur cet article.</p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: ".6rem", maxHeight: "220px", overflowY: "auto" }}>
                      {editComments.map((c) => (
                        <li key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: ".75rem", padding: ".6rem .75rem", background: "#f8f7ff", borderRadius: "10px" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: ".82rem", color: "var(--text-main)" }}>
                              {c.author_name} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>· {formatDate(c.created_at)}</span>
                            </p>
                            <p style={{ margin: ".25rem 0 0", fontSize: ".82rem", color: "var(--text-main)", whiteSpace: "pre-wrap" }}>{c.content}</p>
                          </div>
                          <button type="button" className={styles.btnDanger}
                            onClick={() => handleDeleteComment(c.id, c.author_name)}>
                            Supprimer
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnGhost}
                  onClick={() => setEditingPost(null)} disabled={editSaving}>
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

      {dialog}
    </div>
  );
}
