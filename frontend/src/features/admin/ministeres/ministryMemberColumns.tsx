import styles from "../AdminPage.module.css";
import { createColumnHelper } from "../../../components/ui/DataTable";
import { formatDate } from "../../../lib/format";
import type { MinistryMember } from "../../../types";

const col = createColumnHelper<MinistryMember>();

interface MinistryMemberColumnsOptions {
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  removing: boolean;
  onRemove: (member: MinistryMember) => void;
}

export function ministryMemberColumns({
  selectedIds,
  onToggle,
  removing,
  onRemove,
}: MinistryMemberColumnsOptions) {
  return [
    col.display({
      id: "select",
      header: "",
      cell: (info) => {
        const m = info.row.original;
        return (
          <input
            type="checkbox"
            checked={selectedIds.has(m.id)}
            onChange={() => onToggle(m.id)}
          />
        );
      },
    }),
    col.accessor((m) => `${m.first_name} ${m.last_name}`, {
      id: "name",
      header: "Membre",
      cell: (info) => (
        <>
          {info.getValue()}{" "}
          <span style={{ color: "var(--text-muted)" }}>({info.row.original.email})</span>
        </>
      ),
    }),
    col.accessor("joined_at", {
      header: "Affilié depuis",
      cell: (info) => formatDate(info.getValue()),
    }),
    col.display({
      id: "actions",
      header: "",
      cell: (info) => (
        <button
          className={styles.btnOutlineSm}
          disabled={removing}
          onClick={() => onRemove(info.row.original)}
        >
          Retirer
        </button>
      ),
    }),
  ];
}
