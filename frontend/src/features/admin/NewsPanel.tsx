import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { hasPermission, useAuth } from "../../context/AuthContext";
import { useNews } from "../../hooks/useNews";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { CoverUpload } from "../../components/ui/CoverUpload";
import { DataTable } from "../../components/ui/DataTable";
import { fetchNewsCategories, newsCoverUrl } from "../../lib/api/news";
import { ListFilters } from "./ListFilters";
import { NewsFormModal } from "./news/NewsFormModal";
import { newsColumns } from "./news/newsColumns";
import { STATUSES, STATUS_LABELS } from "./news/newsLabels";
import { useCreateNews, useEditNews } from "./news/useNewsEditor";
import type { NewsStatus } from "../../types";

export function NewsPanel() {
  const { user } = useAuth();
  const { news, loading, error, loadAdmin, add, edit, remove } = useNews();
  const { confirm, dialog } = useConfirm();
  const { toast, toasts } = useToast();

  const [categories, setCategories] = useState<string[]>([]);

  const canManage = hasPermission(user, "news:manage");

  const creation = useCreateNews(add, (title) => {
    loadAdmin();
    toast.success(`Actualité « ${title} » créée.`);
  });
  const edition = useEditNews(edit, (title) => {
    loadAdmin();
    toast.success(`Actualité « ${title} » modifiée.`);
  });

  useEffect(() => {
    loadAdmin();
    fetchNewsCategories().then(setCategories).catch(() => {});
  }, [loadAdmin]);

  async function handleStatusChange(id: number, status: NewsStatus) {
    try {
      await edit(id, { status });
      toast.success(`Statut mis à jour : ${STATUS_LABELS[status]}.`);
    } catch (err) {
      toast.error(err, "Mise à jour impossible.");
    }
  }

  async function handleToggleFeatured(id: number, is_featured: boolean) {
    try {
      await edit(id, { is_featured });
      toast.success(is_featured ? "Actualité mise en avant." : "Actualité retirée de la une.");
    } catch (err) {
      toast.error(err, "Mise à jour impossible.");
    }
  }

  async function handleDelete(id: number, title: string) {
    const ok = await confirm({
      title: `Supprimer l'actualité « ${title} » ?`,
      description: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await remove(id);
      toast.success(`Actualité « ${title} » supprimée.`);
    } catch (err) {
      toast.error(err, "Suppression impossible.");
    }
  }

  if (loading) return <p className={styles.stateMsg}>Chargement…</p>;

  return (
    <div className={styles.rbacWrapper}>
      {error && <p className={styles.errorMsg} role="alert">{error}</p>}

      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          {canManage && (
            <button type="button" className={styles.btnPrimary} onClick={creation.openModal}>
              + Nouvelle actualité
            </button>
          )}
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>Actualités ({news.length})</h3>
        </div>

        <ListFilters
          statuses={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          categories={categories}
          onChange={loadAdmin}
        />

        <div className={styles.listBody}>
          <DataTable
            columns={newsColumns({
              canManage,
              onStatusChange: handleStatusChange,
              onToggleFeatured: handleToggleFeatured,
              onEdit: edition.open,
              onDelete: handleDelete,
            })}
            data={news}
            getRowId={(n) => n.id}
            emptyMessage="Aucune actualité."
          />
        </div>
      </section>

      {creation.open && (
        <NewsFormModal
          icon="📰"
          title="Nouvelle actualité"
          subtitle="Remplissez les informations de la nouvelle actualité."
          value={creation.form}
          onChange={creation.update}
          contentRows={6}
          showPosition={false}
          error={creation.error}
          saving={creation.saving}
          submitLabel="+ Publier"
          onClose={creation.close}
          onSubmit={creation.submit}
        >
          <CoverUpload previewFile={creation.cover} onFileChange={creation.setCover} />
        </NewsFormModal>
      )}

      {edition.news && (
        <NewsFormModal
          icon="✏️"
          title="Modifier l'actualité"
          subtitle={edition.news.title}
          value={edition.form}
          onChange={edition.update}
          contentRows={8}
          showPosition
          error={edition.error}
          saving={edition.saving}
          submitLabel="Enregistrer"
          onClose={edition.close}
          onSubmit={edition.submit}
        >
          <CoverUpload
            currentUrl={edition.coverRemoved ? null : newsCoverUrl(edition.news.cover_image_url)}
            previewFile={edition.cover}
            onFileChange={edition.changeCover}
            onRemove={edition.removeCover}
          />
        </NewsFormModal>
      )}

      {dialog}
      {toasts}
    </div>
  );
}
