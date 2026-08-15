import { useEffect, useState } from "react";
import adminStyles from "./AdminPage.module.css";
import styles from "./EglisesPanel.module.css";
import { hasPermission, useAuth } from "../../context/AuthContext";
import { useChurches } from "../../hooks/useChurches";
import { useParameters } from "../../hooks/useParameters";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { DataTable } from "../../components/ui/DataTable";
import { KpiCard } from "../../components/ui/KpiCard";
import { IconCheckCircle, IconXCircle } from "../../components/ui/icons";
import { ChurchFilters } from "./eglises/ChurchFilters";
import { ChurchFormModal } from "./eglises/ChurchFormModal";
import { NO_CRITERIA, filterChurches } from "./eglises/churchFilter";
import { churchColumns } from "./eglises/churchColumns";
import { useChurchEditor } from "./eglises/useChurchEditor";
import type { ChurchCriteria } from "./eglises/churchFilter";
import type { Church } from "../../types";

export function EglisesPanel() {
  const { user } = useAuth();
  const { churches, loading, error, load, add, edit, remove } = useChurches();
  const { values: districtValues, load: loadDistricts } = useParameters("district");
  const { confirm, dialog } = useConfirm();
  const { toast, toasts } = useToast();

  const [criteria, setCriteria] = useState<ChurchCriteria>(NO_CRITERIA);

  const canManage = hasPermission(user, "church:manage");

  const editor = useChurchEditor({
    add,
    edit,
    onSaved: (name, wasEditing) =>
      toast.success(
        wasEditing ? `Église « ${name} » modifiée.` : `Église « ${name} » créée.`,
      ),
  });

  useEffect(() => {
    load();
    loadDistricts();
  }, [load, loadDistricts]);

  const filteredChurches = filterChurches(churches, criteria);
  const activeCount = churches.filter((c) => c.is_active).length;
  const inactiveCount = churches.filter((c) => !c.is_active).length;

  async function handleDelete(id: number, name: string) {
    const ok = await confirm({
      title: `Supprimer l'église « ${name} » ?`,
      description: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await remove(id);
      toast.success(`Église « ${name} » supprimée.`);
    } catch (err) {
      toast.error(err, "Suppression impossible.");
    }
  }

  async function handleToggleActive(c: Church) {
    const action = c.is_active ? "Désactiver" : "Réactiver";
    const ok = await confirm({
      title: `${action} l'église « ${c.name} » ?`,
      variant: c.is_active ? "danger" : "default",
      confirmLabel: action,
    });
    if (!ok) return;
    try {
      await edit(c.id, { is_active: !c.is_active });
      // Une église désactivée ne s'édite plus : on ferme sa fiche ouverte.
      if (c.is_active && editor.editingId === c.id) editor.close();
      toast.success(
        c.is_active ? `Église « ${c.name} » désactivée.` : `Église « ${c.name} » réactivée.`,
      );
    } catch (err) {
      toast.error(err, "Opération impossible.");
    }
  }

  if (loading) return <p className={adminStyles.stateMsg}>Chargement…</p>;

  return (
    <div className={adminStyles.rbacWrapper}>
      {error && <p className={adminStyles.errorMsg} role="alert">{error}</p>}

      <div className={adminStyles.kpiGrid}>
        <KpiCard color="emerald" icon={<IconCheckCircle />} value={activeCount} label="Actives" />
        <KpiCard color="rose" icon={<IconXCircle />} value={inactiveCount} label="Inactives" />
      </div>

      {canManage && editor.open && (
        <ChurchFormModal
          value={editor.form}
          onChange={editor.update}
          isEditing={editor.isEditing}
          districtValues={districtValues}
          fieldErrors={editor.fieldErrors}
          onClearFieldError={editor.clearFieldError}
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
              + Ajouter une église
            </button>
          )}
          <p className={styles.listTitle}>
            Églises
            <span className={styles.listCount}>{filteredChurches.length}</span>
          </p>
        </div>

        <ChurchFilters districtValues={districtValues} onChange={setCriteria} />

        <DataTable
          columns={churchColumns({
            canManage,
            onEdit: editor.openEdit,
            onToggleActive: handleToggleActive,
            onDelete: handleDelete,
          })}
          data={filteredChurches}
          getRowId={(c) => c.id}
          emptyMessage="Aucune église trouvée."
        />
      </div>

      {dialog}
      {toasts}
    </div>
  );
}
