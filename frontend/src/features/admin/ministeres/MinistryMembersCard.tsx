import styles from "../AdminPage.module.css";
import { DataTable } from "../../../components/ui/DataTable";
import { ministryMemberColumns } from "./ministryMemberColumns";
import type { useMinistryMembers } from "./useMinistryMembers";
import type { MinistryMember, ParameterValue } from "../../../types";

interface MinistryMembersCardProps {
  ministries: ParameterValue[];
  selected: string;
  onSelect: (ministry: string) => void;
  exporting: boolean;
  onExport: () => void;
  error: string;
  members: ReturnType<typeof useMinistryMembers>;
  onRemoveOne: (member: MinistryMember) => void;
  onRemoveSelected: () => void;
}

export function MinistryMembersCard({
  ministries,
  selected,
  onSelect,
  exporting,
  onExport,
  error,
  members,
  onRemoveOne,
  onRemoveSelected,
}: MinistryMembersCardProps) {
  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Ministères</h3>
      <div className={styles.toolbar}>
        <select className={styles.select} value={selected} onChange={(e) => onSelect(e.target.value)}>
          <option value="">Choisir un ministère…</option>
          {ministries.map((m) => (
            <option key={m.id} value={m.label}>{m.label}</option>
          ))}
        </select>
        {selected && (
          <button className={styles.btnOutlineSm} disabled={exporting} onClick={onExport}>
            {exporting ? "…" : "⭳ Exporter (CSV)"}
          </button>
        )}
      </div>

      {error && <p className={styles.errorMsg} role="alert">{error}</p>}

      {selected && (
        <>
          <form
            onSubmit={(e) => { e.preventDefault(); members.reload(); }}
            className={styles.toolbar}
            style={{ marginTop: "1rem" }}
          >
            <input
              className={styles.input}
              placeholder="Rechercher parmi les membres affiliés (nom, courriel)…"
              value={members.query}
              onChange={(e) => members.setQuery(e.target.value)}
            />
            <button type="submit" className={styles.btnOutlineSm}>Rechercher</button>
          </form>

          {members.selectedIds.size > 0 && (
            <div style={{ margin: ".75rem 0" }}>
              <button
                className={styles.btnDanger}
                disabled={members.removing}
                onClick={onRemoveSelected}
              >
                {members.removing ? "…" : `Retirer la sélection (${members.selectedIds.size})`}
              </button>
            </div>
          )}

          {members.loading ? (
            <p className={styles.stateMsg}>Chargement…</p>
          ) : (
            <div style={{ marginTop: "1rem" }}>
              <DataTable
                columns={ministryMemberColumns({
                  selectedIds: members.selectedIds,
                  onToggle: members.toggleSelected,
                  removing: members.removing,
                  onRemove: onRemoveOne,
                })}
                data={members.members}
                getRowId={(m) => m.affiliation_id}
                emptyMessage="Aucun membre actuellement affilié."
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
