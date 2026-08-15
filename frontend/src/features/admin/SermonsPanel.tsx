import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { hasPermission, useAuth } from "../../context/AuthContext";
import { useSermons } from "../../hooks/useSermons";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { DataTable } from "../../components/ui/DataTable";
import { fetchSermonSeries, fetchSermonsStats } from "../../lib/api/sermons";
import { SermonCreateModal } from "./sermons/SermonCreateModal";
import { SermonEditModal } from "./sermons/SermonEditModal";
import { SermonFilters } from "./sermons/SermonFilters";
import { SermonPlayerModal } from "./sermons/SermonPlayerModal";
import { SermonStats } from "./sermons/SermonStats";
import { sermonColumns } from "./sermons/sermonColumns";
import { STATUS_LABELS } from "./sermons/sermonLabels";
import { useCreateSermon, useEditSermon } from "./sermons/useSermonEditor";
import { useSermonPlayer } from "./sermons/useSermonPlayer";
import type { SermonAdminStats, SermonStatus } from "../../types";

export function SermonsPanel() {
  const { user } = useAuth();
  const { sermons, loading, error, loadAdmin, add, edit, replaceMedia, remove } = useSermons();
  const { confirm, dialog } = useConfirm();
  const { toast, toasts } = useToast();

  const [seriesList, setSeriesList] = useState<string[]>([]);
  const [stats, setStats] = useState<SermonAdminStats | null>(null);

  const canManage = hasPermission(user, "sermon:manage");

  const creation = useCreateSermon(add, (title) => toast.success(`Sermon « ${title} » créé.`));
  const edition = useEditSermon(edit, replaceMedia, (title) =>
    toast.success(`Sermon « ${title} » modifié.`),
  );
  const player = useSermonPlayer();

  useEffect(() => {
    loadAdmin();
    fetchSermonSeries().then(setSeriesList).catch(() => {});
    fetchSermonsStats().then(setStats).catch(() => {});
  }, [loadAdmin]);

  async function handleStatusChange(id: number, status: SermonStatus) {
    try {
      await edit(id, { status });
      toast.success(`Statut mis à jour : ${STATUS_LABELS[status]}.`);
    } catch (err) {
      toast.error(err, "Mise à jour impossible.");
    }
  }

  async function handleDelete(id: number, title: string) {
    const ok = await confirm({
      title: `Supprimer le sermon « ${title} » ?`,
      description: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await remove(id);
      toast.success(`Sermon « ${title} » supprimé.`);
    } catch (err) {
      toast.error(err, "Suppression impossible.");
    }
  }

  if (loading) return <p className={styles.stateMsg}>Chargement…</p>;

  return (
    <div className={styles.rbacWrapper}>
      {error && (
        <p className={styles.errorMsg} role="alert">
          {error}
        </p>
      )}

      {stats && <SermonStats stats={stats} />}

      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          {canManage && (
            <button type="button" className={styles.btnPrimary} onClick={creation.openModal}>
              + Ajouter un sermon
            </button>
          )}
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>Sermons ({sermons.length})</h3>
        </div>

        <SermonFilters seriesList={seriesList} onChange={loadAdmin} />

        <div className={styles.listBody}>
          <DataTable
            columns={sermonColumns({
              canManage,
              onStatusChange: handleStatusChange,
              onPlay: player.play,
              onEdit: edition.open,
              onDelete: handleDelete,
            })}
            data={sermons}
            getRowId={(s) => s.id}
            emptyMessage="Aucun sermon enregistré."
          />
        </div>
      </section>

      {creation.open && (
        <SermonCreateModal
          value={creation.form}
          onChange={creation.update}
          onFileChange={creation.setFile}
          error={creation.error}
          saving={creation.saving}
          onClose={creation.close}
          onSubmit={creation.submit}
        />
      )}

      {player.sermon && (
        <SermonPlayerModal
          sermon={player.sermon}
          mediaUrl={player.mediaUrl}
          loading={player.loading}
          onClose={player.close}
        />
      )}

      {edition.sermon && (
        <SermonEditModal
          sermon={edition.sermon}
          value={edition.form}
          onChange={edition.update}
          onFileChange={edition.setFile}
          error={edition.error}
          saving={edition.saving}
          onClose={edition.close}
          onSubmit={edition.submit}
        />
      )}

      {dialog}
      {toasts}
    </div>
  );
}
