import { useState } from "react";
import adminStyles from "../AdminPage.module.css";
import styles from "../EvenementsPanel.module.css";
import { DataTable, createColumnHelper } from "../../../components/ui/DataTable";
import { KpiCard } from "../../../components/ui/KpiCard";
import { IconCalendar, IconCheckCircle, IconFileEdit, IconXCircle } from "../../../components/ui/icons";
import { formatDateTime } from "../../../lib/format";
import type { EventAdminQuery } from "../../../lib/api/events";
import { STATUS_LABELS, churchLabel, formatPrice } from "./shared";
import type { Church, EventItem, EventStatus, ParameterValue } from "../../../types";

const STATUS_BADGE_CLASS: Record<EventStatus, string> = {
  draft: "badgeDraft",
  published: "badgePublished",
  cancelled: "badgeCancelled",
  completed: "badgeCompleted",
};

const STATUS_TABS: { id: "all" | EventStatus; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "draft", label: "Brouillons" },
  { id: "published", label: "Publiés" },
  { id: "cancelled", label: "Annulés" },
  { id: "completed", label: "Terminés" },
];

const col = createColumnHelper<EventItem>();

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
  const [filterQ, setFilterQ] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | EventStatus>("all");

  function applyFilters(overrides?: { q?: string; category?: string; district?: string }) {
    const q = overrides?.q ?? filterQ;
    const category = overrides?.category ?? filterCategory;
    const district = overrides?.district ?? filterDistrict;
    loadAdmin({
      q: q.trim() || undefined,
      category: category || undefined,
      district: district || undefined,
    });
  }

  const kpi = {
    total: events.length,
    draft: events.filter((e) => e.status === "draft").length,
    published: events.filter((e) => e.status === "published").length,
    cancelled: events.filter((e) => e.status === "cancelled").length,
  };

  const visibleEvents = statusTab === "all" ? events : events.filter((e) => e.status === statusTab);

  const columns = [
    col.accessor("title", {
      header: "Événement",
      cell: (info) => {
        const e = info.row.original;
        return (
          <div className={adminStyles.actions} style={{ alignItems: "center" }}>
            <strong>{info.getValue()}</strong>
            <span className={styles[STATUS_BADGE_CLASS[e.status]]}>{STATUS_LABELS[e.status]}</span>
          </div>
        );
      },
    }),
    col.accessor("category", { header: "Catégorie" }),
    col.accessor("date_start", {
      header: "Date",
      cell: (info) => formatDateTime(info.getValue()),
    }),
    col.display({
      id: "lieu",
      header: "Lieu / Format",
      cell: (info) => {
        const e = info.row.original;
        return (
          <>
            {(e.format === "en_ligne" || e.format === "hybride") && (
              <div>
                {e.format === "hybride" ? "Hybride" : "En ligne"}
                {e.online_link ? ` · ${e.online_link}` : ""}
              </div>
            )}
            {(e.format === "presentiel" || e.format === "hybride") && e.location && (
              <div>{e.location}</div>
            )}
          </>
        );
      },
    }),
    col.display({
      id: "instructor",
      header: "Intervenant",
      cell: (info) => {
        const e = info.row.original;
        if (!e.instructor) return "—";
        return `${e.instructor}${e.intervenant_category ? ` (${e.intervenant_category})` : ""}`;
      },
    }),
    col.display({
      id: "church",
      header: "Église / District",
      cell: (info) => {
        const e = info.row.original;
        return `${churchLabel(churches, e.church_id)}${e.district ? ` · ${e.district}` : ""}`;
      },
    }),
    col.accessor("price", {
      header: "Prix",
      cell: (info) => formatPrice(info.getValue()),
    }),
    col.display({
      id: "registrations",
      header: "Inscriptions",
      cell: (info) => {
        const e = info.row.original;
        return e.capacity !== null
          ? `${e.registered_count} / ${e.capacity}`
          : `${e.registered_count} · illimité`;
      },
    }),
    ...(canManage
      ? [
          col.display({
            id: "actions",
            header: "Actions",
            cell: (info) => {
              const e = info.row.original;
              return (
                <div className={adminStyles.actions}>
                  <button className={adminStyles.btnOutlineSm} onClick={() => onEdit(e)}>
                    Modifier
                  </button>
                  <select
                    className={styles.filterSelect}
                    value={e.status}
                    onChange={(ev) => onStatusChange(e.id, ev.target.value as EventStatus)}
                  >
                    {(Object.keys(STATUS_LABELS) as EventStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button className={adminStyles.btnOutlineSm} onClick={() => onOpenParticipants(e)}>
                    Participants
                  </button>
                  <button className={adminStyles.btnOutlineSm} onClick={() => onOpenVolunteers(e)}>
                    Bénévoles
                  </button>
                  <button className={adminStyles.btnDanger} onClick={() => onDelete(e.id, e.title)}>
                    Supprimer
                  </button>
                </div>
              );
            },
          }),
        ]
      : []),
  ];

  return (
    <>
      {/* ── KPIs ── */}
      <div className={styles.kpiGrid}>
        <KpiCard color="violet" icon={<IconCalendar />} value={kpi.total} label="Total" />
        <KpiCard color="amber" icon={<IconFileEdit />} value={kpi.draft} label="Brouillons" />
        <KpiCard color="emerald" icon={<IconCheckCircle />} value={kpi.published} label="Publiés" />
        <KpiCard color="rose" icon={<IconXCircle />} value={kpi.cancelled} label="Annulés" />
      </div>

      {/* ── Liste ── */}
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

        <div className={styles.statusTabs}>
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={statusTab === t.id ? `${styles.statusTab} ${styles.statusTabActive}` : styles.statusTab}
              onClick={() => setStatusTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.filterRow}>
          <input
            className={styles.filterInput}
            placeholder="Rechercher (titre, lieu)…"
            value={filterQ}
            onChange={(e) => { setFilterQ(e.target.value); applyFilters({ q: e.target.value }); }}
          />
          <select
            className={styles.filterSelect}
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); applyFilters({ category: e.target.value }); }}
          >
            <option value="">Toutes catégories</option>
            {categoryValues.map((c) => (
              <option key={c.id} value={c.label}>{c.label}</option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={filterDistrict}
            onChange={(e) => { setFilterDistrict(e.target.value); applyFilters({ district: e.target.value }); }}
          >
            <option value="">Tous les districts</option>
            {districtValues.map((d) => (
              <option key={d.id} value={d.label}>{d.label}</option>
            ))}
          </select>
        </div>

        <DataTable
          columns={columns}
          data={visibleEvents}
          getRowId={(e) => e.id}
          emptyMessage="Aucun événement trouvé."
        />
      </div>
    </>
  );
}
