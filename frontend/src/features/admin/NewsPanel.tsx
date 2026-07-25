import { useEffect, useRef, useState } from "react";
import styles from "./AdminPage.module.css";
import coverStyles from "./BlogPanel.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNews } from "../../hooks/useNews";
import { useConfirm } from "../../hooks/useConfirm";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import { fetchNewsCategories, uploadNewsCover, deleteNewsCover, newsCoverUrl } from "../../lib/api/news";
import type { News, NewsInput, NewsStatus } from "../../types";

const EMPTY: NewsInput = {
  title: "",
  content: "",
  excerpt: "",
  author: "",
  status: "draft",
  category: "",
  is_featured: false,
  position: 0,
};

const STATUS_LABELS: Record<NewsStatus, string> = {
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

// ── CoverUpload — même zone de dépôt que le blog ──────────────────────────────

interface CoverUploadProps {
  currentUrl?: string | null;
  onFileChange: (file: File | null) => void;
  onRemove?: () => void;
  previewFile: File | null;
}

function CoverUpload({ currentUrl, onFileChange, onRemove, previewFile }: CoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const resolvedCurrent = newsCoverUrl(currentUrl);
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

const col = createColumnHelper<News>();

export function NewsPanel() {
  const { user } = useAuth();
  const { news, loading, error, loadAdmin, add, edit, remove } = useNews();
  const { confirm, dialog } = useConfirm();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<NewsInput>(EMPTY);
  const [createCover, setCreateCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [editForm, setEditForm] = useState<NewsInput>(EMPTY);
  const [editCover, setEditCover] = useState<File | null>(null);
  const [removeEditCover, setRemoveEditCover] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [filterQ, setFilterQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  const canManage =
    user?.permissions.includes("*") || user?.permissions.includes("news:manage");

  useEffect(() => {
    loadAdmin();
    fetchNewsCategories().then(setCategories).catch(() => {});
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
        await uploadNewsCover(created.id, createCover);
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

  function openEdit(n: News) {
    setEditingNews(n);
    setEditForm({
      title: n.title,
      content: n.content,
      excerpt: n.excerpt ?? "",
      author: n.author,
      status: n.status,
      category: n.category ?? "",
      is_featured: n.is_featured,
      position: n.position,
    });
    setEditCover(null);
    setRemoveEditCover(false);
    setEditError("");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingNews) return;
    if (!editForm.title.trim() || !editForm.content.trim() || !editForm.author.trim()) {
      setEditError("Titre, contenu et auteur sont requis.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      await edit(editingNews.id, {
        title: editForm.title,
        content: editForm.content,
        excerpt: editForm.excerpt?.trim() || undefined,
        author: editForm.author,
        status: editForm.status,
        category: editForm.category?.trim() || undefined,
        is_featured: editForm.is_featured,
        position: editForm.position,
      });
      if (editCover) {
        await uploadNewsCover(editingNews.id, editCover);
      } else if (removeEditCover && editingNews.cover_image_url) {
        await deleteNewsCover(editingNews.id);
      }
      setEditingNews(null);
      loadAdmin();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleStatusChange(id: number, status: NewsStatus) {
    try { await edit(id, { status }); }
    catch (err) { alert(err instanceof Error ? err.message : "Mise à jour impossible"); }
  }

  async function handleToggleFeatured(id: number, is_featured: boolean) {
    try { await edit(id, { is_featured }); }
    catch (err) { alert(err instanceof Error ? err.message : "Mise à jour impossible"); }
  }

  async function handleDelete(id: number, title: string) {
    const ok = await confirm({
      title: `Supprimer l'actualité « ${title} » ?`,
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
        const n = info.row.original;
        const url = newsCoverUrl(n.cover_image_url);
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
    col.display({
      id: "featured",
      header: "À la une",
      cell: (info) => {
        const n = info.row.original;
        return canManage ? (
          <input
            type="checkbox"
            checked={n.is_featured}
            onChange={(e) => handleToggleFeatured(n.id, e.target.checked)}
            title="Mettre en avant sur le carrousel d'accueil"
          />
        ) : n.is_featured ? "★" : "";
      },
    }),
    col.accessor("status", {
      header: "Statut",
      cell: (info) => {
        const n = info.row.original;
        return canManage ? (
          <select className={styles.select} value={n.status}
            onChange={(e) => handleStatusChange(n.id, e.target.value as NewsStatus)}>
            {(Object.keys(STATUS_LABELS) as NewsStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        ) : STATUS_LABELS[n.status];
      },
    }),
    ...(canManage
      ? [
          col.display({
            id: "actions",
            header: "",
            cell: (info) => {
              const n = info.row.original;
              return (
                <div className={styles.actions}>
                  <button className={styles.btnOutlineSm} onClick={() => openEdit(n)}>Modifier</button>
                  <button className={styles.btnDanger} onClick={() => handleDelete(n.id, n.title)}>Supprimer</button>
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

      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          {canManage && (
            <button type="button" className={styles.btnPrimary} onClick={openCreateModal}>
              + Nouvelle actualité
            </button>
          )}
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>Actualités ({news.length})</h3>
        </div>
        <div className={styles.filterBar}>
          <input className={styles.input} placeholder="Rechercher…" value={filterQ}
            style={{ flex: "1 1 160px" }}
            onChange={(e) => { setFilterQ(e.target.value); applyFilters({ q: e.target.value }); }} />
          <select className={styles.select} value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); applyFilters({ status: e.target.value }); }}>
            <option value="">Tous statuts</option>
            {(Object.keys(STATUS_LABELS) as NewsStatus[]).map((s) => (
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
            data={news}
            getRowId={(n) => n.id}
            emptyMessage="Aucune actualité."
          />
        </div>
      </section>

      {/* ── Modale création ── */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "780px" }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderIcon}>📰</div>
              <div className={styles.modalHeaderText}>
                <h2 className={styles.modalName}>Nouvelle actualité</h2>
                <span className={styles.modalSubtitle}>Remplissez les informations de la nouvelle actualité.</span>
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
                    onChange={(e) => setForm({ ...form, status: e.target.value as NewsStatus })}>
                    {(Object.keys(STATUS_LABELS) as NewsStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <label className={styles.permCheckbox} style={{ gridColumn: "1 / -1" }}>
                    <input type="checkbox" checked={form.is_featured ?? false}
                      onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
                    <span>Mettre en avant sur le carrousel d'accueil</span>
                  </label>
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
      {editingNews && (
        <div className={styles.modalOverlay} onClick={() => setEditingNews(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "780px" }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderIcon}>✏️</div>
              <div className={styles.modalHeaderText}>
                <h2 className={styles.modalName}>Modifier l'actualité</h2>
                <span className={styles.modalSubtitle}>{editingNews.title}</span>
              </div>
              <button className={styles.modalClose} onClick={() => setEditingNews(null)} aria-label="Fermer">✕</button>
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
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as NewsStatus })}>
                    {(Object.keys(STATUS_LABELS) as NewsStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <label className={styles.permCheckbox} style={{ gridColumn: "1 / -1" }}>
                    <input type="checkbox" checked={editForm.is_featured ?? false}
                      onChange={(e) => setEditForm({ ...editForm, is_featured: e.target.checked })} />
                    <span>Mettre en avant sur le carrousel d'accueil</span>
                  </label>
                  <input className={styles.input} type="number" placeholder="Position (ordre parmi les épinglées)"
                    value={editForm.position ?? 0}
                    onChange={(e) => setEditForm({ ...editForm, position: Number(e.target.value) })} />
                  <textarea className={styles.input} placeholder="Résumé / extrait" rows={2}
                    value={editForm.excerpt ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, excerpt: e.target.value })} />
                  <textarea className={styles.input} placeholder="Contenu complet *" rows={8} required
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    style={{ gridColumn: "1 / -1" }} />
                  <CoverUpload
                    currentUrl={removeEditCover ? null : editingNews.cover_image_url}
                    previewFile={editCover}
                    onFileChange={(f) => { setEditCover(f); if (!f) setRemoveEditCover(false); }}
                    onRemove={() => { setRemoveEditCover(true); setEditCover(null); }}
                  />
                </div>
                {editError && (
                  <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>{editError}</p>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnGhost}
                  onClick={() => setEditingNews(null)} disabled={editSaving}>
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
