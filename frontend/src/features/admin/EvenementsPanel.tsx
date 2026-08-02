import { useEffect, useState } from "react";
import adminStyles from "./AdminPage.module.css";
import styles from "./EvenementsPanel.module.css";
import { hasPermission, useAuth } from "../../context/AuthContext";
import { useChurches } from "../../hooks/useChurches";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { useEvents } from "../../hooks/useEvents";
import { useParameters } from "../../hooks/useParameters";
import { exportEventRegistrations, uploadEventImage } from "../../lib/api/events";
import { EvenementsForm } from "./evenements/EvenementsForm";
import { EvenementsList } from "./evenements/EvenementsList";
import { EvenementsParticipantsModal } from "./evenements/EvenementsParticipantsModal";
import { EvenementsVolunteersModal } from "./evenements/EvenementsVolunteersModal";
import { EMPTY, STATUS_LABELS, eventToForm } from "./evenements/shared";
import { EvenementsStatsPanel } from "./EvenementsStatsPanel";
import type { EventInput, EventItem, EventStatus } from "../../types";

export function EvenementsPanel() {
  const { user } = useAuth();
  const {
    events,
    loading,
    error,
    loadAdmin,
    add,
    edit,
    remove,
    participants,
    participantsLoading,
    loadParticipants,
  } = useEvents();
  const { churches, load: loadChurches } = useChurches();
  const { values: districtValues, load: loadDistricts } = useParameters("district");
  const { values: categoryValues, load: loadCategories } = useParameters("event_category");
  const { values: intervenantCategoryValues, load: loadIntervenantCategories } =
    useParameters("intervenant_category");
  const { confirm, dialog } = useConfirm();
  const { toast, toasts } = useToast();

  const canManage = hasPermission(user, "event:manage");

  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const isEditing = editingEvent !== null;

  const [participantsEvent, setParticipantsEvent] = useState<EventItem | null>(null);
  const [volunteersEvent, setVolunteersEvent] = useState<EventItem | null>(null);
  const [exporting, setExporting] = useState(false);
  const [view, setView] = useState<"liste" | "statistiques">("liste");

  useEffect(() => {
    loadAdmin();
    loadChurches();
    loadDistricts();
    loadCategories();
    loadIntervenantCategories();
  }, [loadAdmin, loadChurches, loadDistricts, loadCategories, loadIntervenantCategories]);

  function openCreate() {
    setEditingEvent(null);
    setShowModal(true);
  }

  function startEdit(e: EventItem) {
    setEditingEvent(e);
    setShowModal(true);
  }

  function cancelEdit() {
    setShowModal(false);
    setEditingEvent(null);
  }

  async function handleFormSubmit(payload: EventInput, imageFile: File | null) {
    const wasEditing = editingEvent !== null;
    const saved = editingEvent ? await edit(editingEvent.id, payload) : await add(payload);
    if (imageFile) {
      await uploadEventImage(saved.id, imageFile);
      loadAdmin();
    }
    cancelEdit();
    toast.success(
      wasEditing
        ? `Événement « ${saved.title} » modifié.`
        : `Événement « ${saved.title} » créé.`,
    );
  }

  async function handleDelete(id: number, title: string) {
    const ok = await confirm({
      title: `Supprimer l'événement « ${title} » ?`,
      description: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await remove(id);
      toast.success(`Événement « ${title} » supprimé.`);
    } catch (err) {
      toast.error(err, "Suppression impossible.");
    }
  }

  async function handleStatusChange(id: number, status: EventStatus) {
    try {
      await edit(id, { status });
      toast.success(`Statut mis à jour : ${STATUS_LABELS[status]}.`);
    } catch (err) {
      toast.error(err, "Mise à jour impossible.");
    }
  }

  function openParticipants(e: EventItem) {
    setParticipantsEvent(e);
    loadParticipants(e.id);
  }

  async function handleExportCsv() {
    if (!participantsEvent) return;
    setExporting(true);
    try {
      const blob = await exportEventRegistrations(participantsEvent.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inscriptions-evenement-${participantsEvent.id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err, "Export impossible.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <p className={adminStyles.stateMsg}>Chargement…</p>;

  return (
    <div className={adminStyles.rbacWrapper}>
      {error && <p className={adminStyles.errorMsg} role="alert">{error}</p>}

      {canManage && showModal && (
        <EvenementsForm
          initialValue={editingEvent ? eventToForm(editingEvent) : EMPTY}
          initialImageUrl={editingEvent?.image_url ?? null}
          isEditing={isEditing}
          churches={churches}
          districtValues={districtValues}
          categoryValues={categoryValues}
          intervenantCategoryValues={intervenantCategoryValues}
          onSubmit={handleFormSubmit}
          onCancel={cancelEdit}
        />
      )}

      {/* ── Onglets de vue ── */}
      <div className={styles.statusTabs} style={{ padding: "0 0 1rem" }}>
        <button
          type="button"
          className={view === "liste" ? `${styles.statusTab} ${styles.statusTabActive}` : styles.statusTab}
          onClick={() => setView("liste")}
        >
          📋 Liste
        </button>
        <button
          type="button"
          className={view === "statistiques" ? `${styles.statusTab} ${styles.statusTabActive}` : styles.statusTab}
          onClick={() => setView("statistiques")}
        >
          📊 Statistiques
        </button>
      </div>

      {view === "statistiques" ? (
        <EvenementsStatsPanel />
      ) : (
        <EvenementsList
          events={events}
          loadAdmin={loadAdmin}
          churches={churches}
          districtValues={districtValues}
          categoryValues={categoryValues}
          canManage={canManage}
          onCreate={openCreate}
          onEdit={startEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onOpenParticipants={openParticipants}
          onOpenVolunteers={setVolunteersEvent}
        />
      )}

      {participantsEvent && (
        <EvenementsParticipantsModal
          event={participantsEvent}
          participants={participants}
          participantsLoading={participantsLoading}
          exporting={exporting}
          onClose={() => setParticipantsEvent(null)}
          onExportCsv={handleExportCsv}
        />
      )}

      {volunteersEvent && (
        <EvenementsVolunteersModal
          event={volunteersEvent}
          onClose={() => setVolunteersEvent(null)}
        />
      )}

      {dialog}
      {toasts}
    </div>
  );
}
