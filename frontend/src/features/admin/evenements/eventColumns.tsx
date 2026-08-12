import adminStyles from "../AdminPage.module.css";
import styles from "../EvenementsPanel.module.css";
import { createColumnHelper } from "../../../components/ui/DataTable";
import { formatDateTime } from "../../../lib/format";
import { STATUS_BADGE_CLASS, STATUS_LABELS, churchLabel, eventPriceLabel } from "./eventLabels";
import type { Church, EventItem, EventStatus } from "../../../types";

const col = createColumnHelper<EventItem>();

const STATUSES = Object.keys(STATUS_LABELS) as EventStatus[];

function venueLabel(e: EventItem) {
  const online = e.format === "en_ligne" || e.format === "hybride";
  const onSite = e.format === "presentiel" || e.format === "hybride";
  return (
    <>
      {online && (
        <div>
          {e.format === "hybride" ? "Hybride" : "En ligne"}
          {e.online_link ? ` · ${e.online_link}` : ""}
        </div>
      )}
      {onSite && e.location && <div>{e.location}</div>}
    </>
  );
}

function instructorLabel(e: EventItem): string {
  if (!e.instructor) return "—";
  return `${e.instructor}${e.intervenant_category ? ` (${e.intervenant_category})` : ""}`;
}

function registrationsLabel(e: EventItem): string {
  if (e.capacity === null) return `${e.registered_count} · illimité`;
  return `${e.registered_count} / ${e.capacity}`;
}

interface EventColumnsOptions {
  /** Sans le droit de gestion, la liste reste en lecture seule. */
  canManage: boolean;
  churches: Church[];
  onEdit: (e: EventItem) => void;
  onStatusChange: (id: number, status: EventStatus) => void;
  onOpenParticipants: (e: EventItem) => void;
  onOpenVolunteers: (e: EventItem) => void;
  onDelete: (id: number, title: string) => void;
}

export function eventColumns({
  canManage,
  churches,
  onEdit,
  onStatusChange,
  onOpenParticipants,
  onOpenVolunteers,
  onDelete,
}: EventColumnsOptions) {
  return [
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
      cell: (info) => venueLabel(info.row.original),
    }),
    col.display({
      id: "instructor",
      header: "Intervenant",
      cell: (info) => instructorLabel(info.row.original),
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
      cell: (info) => eventPriceLabel(info.getValue()),
    }),
    col.display({
      id: "registrations",
      header: "Inscriptions",
      cell: (info) => registrationsLabel(info.row.original),
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
                    {STATUSES.map((s) => (
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
}
