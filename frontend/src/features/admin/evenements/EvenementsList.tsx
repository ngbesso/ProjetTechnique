import { useState } from "react";
import styles from "../EvenementsPanel.module.css";
import { DataTable } from "../../../components/ui/DataTable";
import { EventKpis } from "./EventKpis";
import { EventListFilters } from "./EventListFilters";
import { EventStatusTabs } from "./EventStatusTabs";
import { eventColumns } from "./eventColumns";
import type { StatusTab } from "./EventStatusTabs";
import type { EventAdminQuery } from "../../../lib/api/events";
import type { Church, EventItem, EventStatus, ParameterValue } from "../../../types";

interface EvenementsListProps {
  events: EventItem[];
  loadAdmin: (params?: EventAdminQuery) => void;
  churches: Church[];
  districtValues: ParameterValue[];
  categoryValues: ParameterValue[];
  canManage: boolean;
  onCreate: () => void;
  onEdit: (e: EventItem) => void;
  onDelete: (id: number, title: string) => void;
  onStatusChange: (id: number, status: EventStatus) => void;
  onOpenParticipants: (e: EventItem) => void;
  onOpenVolunteers: (e: EventItem) => void;
}

export function EvenementsList({
  events,
  loadAdmin,
  churches,
  districtValues,
  categoryValues,
  canManage,
  onCreate,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenParticipants,
  onOpenVolunteers,
}: EvenementsListProps) {
  // L'onglet filtre la liste déjà chargée ; les autres critères repassent par
  // le serveur.
  const [statusTab, setStatusTab] = useState<StatusTab>("all");

  const visibleEvents = statusTab === "all" ? events : events.filter((e) => e.status === statusTab);

  return (
    <>
      <EventKpis events={events} />

      <div className={styles.listCard}>
        <div className={styles.listHeader}>
          {canManage && (
            <button type="button" className={styles.btnPrimary} onClick={onCreate}>
              + Créer un événement
            </button>
          )}
          <p className={styles.listTitle}>
            Événements
            <span className={styles.listCount}>{visibleEvents.length}</span>
          </p>
        </div>

        <EventStatusTabs active={statusTab} onChange={setStatusTab} />

        <EventListFilters
          categoryValues={categoryValues}
          districtValues={districtValues}
          onChange={loadAdmin}
        />

        <DataTable
          columns={eventColumns({
            canManage,
            churches,
            onEdit,
            onStatusChange,
            onOpenParticipants,
            onOpenVolunteers,
            onDelete,
          })}
          data={visibleEvents}
          getRowId={(e) => e.id}
          emptyMessage="Aucun événement trouvé."
        />
      </div>
    </>
  );
}
