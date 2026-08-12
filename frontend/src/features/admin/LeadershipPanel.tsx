import { useEffect } from "react";
import adminStyles from "./AdminPage.module.css";
import styles from "./LeadershipPanel.module.css";
import { hasPermission, useAuth } from "../../context/AuthContext";
import { useChurches } from "../../hooks/useChurches";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { useLeaders } from "../../hooks/useLeaders";
import { useParameters } from "../../hooks/useParameters";
import { DataTable } from "../../components/ui/DataTable";
import { KpiCard } from "../../components/ui/KpiCard";
import { IconCheckCircle, IconXCircle } from "../../components/ui/icons";
import { LeaderFilters } from "./leadership/LeaderFilters";
import { LeaderFormModal } from "./leadership/LeaderFormModal";
import { leaderColumns } from "./leadership/leaderColumns";
import { useLeaderEditor } from "./leadership/useLeaderEditor";
import type { Leader } from "../../types";

export function LeadershipPanel() {
  const { user } = useAuth();
  const { leaders, loading, error, loadAdmin, add, edit, remove, uploadPhoto } = useLeaders();
  const { churches, load: loadChurches } = useChurches();
  const { values: roleValues, load: loadRoles } = useParameters("leader_role");
  const { confirm, dialog } = useConfirm();
  const { toast, toasts } = useToast();

  const canManage = hasPermission(user, "leader:manage");

  const editor = useLeaderEditor({
    add,
    edit,
    onSaved: (name, wasEditing) =>
      toast.success(wasEditing ? `Fiche de ${name} modifiée.` : `${name} ajouté au leadership.`),
  });

  useEffect(() => {
    loadAdmin();
    loadChurches();
    loadRoles();
  }, [loadAdmin, loadChurches, loadRoles]);

  const publishedCount = leaders.filter((l) => l.is_published).length;
  const draftCount = leaders.filter((l) => !l.is_published).length;

  async function handleDelete(id: number, name: string) {
    const ok = await confirm({
      title: `Supprimer « ${name} » du leadership ?`,
      description: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await remove(id);
      toast.success(`« ${name} » retiré du leadership.`);
    } catch (err) {
      toast.error(err, "Suppression impossible.");
    }
  }

  async function handleTogglePublish(l: Leader) {
    const action = l.is_published ? "Dépublier" : "Publier";
    const ok = await confirm({
      title: `${action} la fiche de ${l.first_name} ${l.last_name} ?`,
      variant: l.is_published ? "danger" : "default",
      confirmLabel: action,
    });
    if (!ok) return;
    try {
      await edit(l.id, { is_published: !l.is_published });
      toast.success(l.is_published ? "Fiche dépubliée." : "Fiche publiée.");
    } catch (err) {
      toast.error(err, "Opération impossible.");
    }
  }

  async function handlePhotoChange(l: Leader, file: File) {
    try {
      await uploadPhoto(l.id, file);
      toast.success("Photo mise à jour.");
    } catch (err) {
      toast.error(err, "Envoi de la photo impossible.");
    }
  }

  if (loading) return <p className={adminStyles.stateMsg}>Chargement…</p>;

  return (
    <div className={adminStyles.rbacWrapper}>
      {error && <p className={adminStyles.errorMsg} role="alert">{error}</p>}

      <div className={adminStyles.kpiGrid}>
        <KpiCard color="emerald" icon={<IconCheckCircle />} value={publishedCount} label="Publiés" />
        <KpiCard color="rose" icon={<IconXCircle />} value={draftCount} label="Brouillons" />
      </div>

      {canManage && editor.open && (
        <LeaderFormModal
          value={editor.form}
          onChange={editor.update}
          isEditing={editor.isEditing}
          churches={churches}
          roleValues={roleValues}
          error={editor.error}
          saving={editor.saving}
          onClose={editor.close}
          onSubmit={editor.submit}
        />
      )}

      <div className={styles.listCard}>
        <div className={styles.listHeader}>
          {canManage && (
            <button type="button" className={styles.btnPrimary} onClick={editor.openCreate}>
              + Ajouter un membre
            </button>
          )}
          <p className={styles.listTitle}>
            Corps de leadership
            <span className={styles.listCount}>{leaders.length}</span>
          </p>
        </div>

        <LeaderFilters roleValues={roleValues} onChange={loadAdmin} />

        <DataTable
          columns={leaderColumns({
            canManage,
            churches,
            onEdit: editor.openEdit,
            onUploadPhoto: handlePhotoChange,
            onTogglePublish: handleTogglePublish,
            onDelete: handleDelete,
          })}
          data={leaders}
          getRowId={(l) => l.id}
          emptyMessage="Aucun membre du leadership trouvé."
        />
      </div>

      {dialog}
      {toasts}
    </div>
  );
}
