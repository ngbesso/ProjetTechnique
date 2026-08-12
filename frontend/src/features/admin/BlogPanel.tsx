import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { hasPermission, useAuth } from "../../context/AuthContext";
import { usePosts } from "../../hooks/usePosts";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { CoverUpload } from "../../components/ui/CoverUpload";
import { DataTable } from "../../components/ui/DataTable";
import { coverUrl, fetchPostCategories, fetchPostsStats } from "../../lib/api/posts";
import { ListFilters } from "./ListFilters";
import { BlogStats } from "./blog/BlogStats";
import { PostFormModal } from "./blog/PostFormModal";
import { postColumns } from "./blog/postColumns";
import { STATUSES, STATUS_LABELS } from "./blog/postLabels";
import { useCreatePost, useEditPost } from "./blog/usePostEditor";
import type { PostAdminStats, PostStatus } from "../../types";

export function BlogPanel() {
  const { user } = useAuth();
  const { posts, loading, error, loadAdmin, add, edit, remove } = usePosts();
  const { confirm, dialog } = useConfirm();
  const { toast, toasts } = useToast();

  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<PostAdminStats | null>(null);

  const canManage = hasPermission(user, "post:manage");

  const creation = useCreatePost(add, (title) => {
    loadAdmin();
    toast.success(`Article « ${title} » créé.`);
  });
  const edition = useEditPost(edit, (title) => {
    loadAdmin();
    toast.success(`Article « ${title} » modifié.`);
  });

  useEffect(() => {
    loadAdmin();
    fetchPostCategories().then(setCategories).catch(() => {});
    fetchPostsStats().then(setStats).catch(() => {});
  }, [loadAdmin]);

  async function handleStatusChange(id: number, status: PostStatus) {
    try {
      await edit(id, { status });
      toast.success(`Statut mis à jour : ${STATUS_LABELS[status]}.`);
    } catch (err) {
      toast.error(err, "Mise à jour impossible.");
    }
  }

  async function handleDelete(id: number, title: string) {
    const ok = await confirm({
      title: `Supprimer l'article « ${title} » ?`,
      description: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await remove(id);
      toast.success(`Article « ${title} » supprimé.`);
    } catch (err) {
      toast.error(err, "Suppression impossible.");
    }
  }

  if (loading) return <p className={styles.stateMsg}>Chargement…</p>;

  return (
    <div className={styles.rbacWrapper}>
      {error && <p className={styles.errorMsg} role="alert">{error}</p>}

      {stats && <BlogStats stats={stats} />}

      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          {canManage && (
            <button type="button" className={styles.btnPrimary} onClick={creation.openModal}>
              + Nouvel article
            </button>
          )}
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>Articles ({posts.length})</h3>
        </div>

        <ListFilters
          statuses={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          categories={categories}
          onChange={loadAdmin}
        />

        <div className={styles.listBody}>
          <DataTable
            columns={postColumns({
              canManage,
              onStatusChange: handleStatusChange,
              onEdit: edition.open,
              onDelete: handleDelete,
            })}
            data={posts}
            getRowId={(p) => p.id}
            emptyMessage="Aucun article."
          />
        </div>
      </section>

      {creation.open && (
        <PostFormModal
          icon="📝"
          title="Nouvel article"
          subtitle="Remplissez les informations du nouvel article."
          value={creation.form}
          onChange={creation.update}
          contentRows={6}
          error={creation.error}
          saving={creation.saving}
          submitLabel="+ Publier"
          onClose={creation.close}
          onSubmit={creation.submit}
        >
          <CoverUpload previewFile={creation.cover} onFileChange={creation.setCover} />
        </PostFormModal>
      )}

      {edition.post && (
        <PostFormModal
          icon="✏️"
          title="Modifier l'article"
          subtitle={edition.post.title}
          value={edition.form}
          onChange={edition.update}
          contentRows={8}
          error={edition.error}
          saving={edition.saving}
          submitLabel="Enregistrer"
          onClose={edition.close}
          onSubmit={edition.submit}
        >
          <CoverUpload
            currentUrl={edition.coverRemoved ? null : coverUrl(edition.post.cover_image_url)}
            previewFile={edition.cover}
            onFileChange={edition.changeCover}
            onRemove={edition.removeCover}
          />
        </PostFormModal>
      )}

      {dialog}
      {toasts}
    </div>
  );
}
