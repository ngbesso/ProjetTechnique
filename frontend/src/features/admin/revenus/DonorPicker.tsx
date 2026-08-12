import { useState } from "react";
import styles from "../AdminPage.module.css";
import { SearchPicker } from "./SearchPicker";
import { emptySelection } from "./donorSelection";
import { createDonor, searchDonors } from "../../../lib/api/donors";
import { fetchMembers } from "../../../lib/api/members";
import type { DonorMode, DonorSelection } from "./donorSelection";
import type { Donor, Member } from "../../../types";

interface DonorPickerProps {
  value: DonorSelection;
  onChange: (selection: DonorSelection) => void;
  onError: (message: string) => void;
}

const MODE_LABELS: Record<DonorMode, string> = {
  anonyme: "Anonyme",
  membre: "Membre",
  donateur: "Donateur",
};

const MODES = Object.keys(MODE_LABELS) as DonorMode[];

function SelectedChip({ label, onClear, clearLabel }: {
  label: string;
  onClear: () => void;
  clearLabel: string;
}) {
  return (
    <span className={styles.badge}>
      {label}
      <button type="button" className={styles.chipX} aria-label={clearLabel} onClick={onClear}>
        ×
      </button>
    </span>
  );
}

export function DonorPicker({ value, onChange, onError }: DonorPickerProps) {
  const [newDonorEmail, setNewDonorEmail] = useState("");
  const [creatingDonor, setCreatingDonor] = useState(false);

  async function addDonor(name: string) {
    if (!name.trim()) return;
    setCreatingDonor(true);
    try {
      const created = await createDonor({
        name: name.trim(),
        email: newDonorEmail.trim() || undefined,
      });
      onChange({ mode: "donateur", donor: created });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Impossible de créer le donateur");
    } finally {
      setCreatingDonor(false);
    }
  }

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--text-muted)" }}>
        Donateur
      </label>
      <div className={styles.inlineForm} style={{ gap: "0.4rem", marginBottom: "0.5rem" }}>
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            className={value.mode === mode ? styles.btnPrimary : styles.btnOutlineSm}
            onClick={() => onChange(emptySelection(mode))}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      {value.mode === "anonyme" && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            className={styles.input}
            placeholder="Nom du donateur (optionnel)"
            style={{ flex: "1 1 200px" }}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
          <input
            className={styles.input}
            type="email"
            placeholder="Courriel du donateur (optionnel)"
            style={{ flex: "1 1 200px" }}
            value={value.email}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
          />
        </div>
      )}

      {value.mode === "membre" && (
        value.member ? (
          <SelectedChip
            label={`${value.member.first_name} ${value.member.last_name}`}
            clearLabel="Retirer le membre sélectionné"
            onClear={() => onChange({ mode: "membre", member: null })}
          />
        ) : (
          <SearchPicker<Member>
            placeholder="Rechercher un membre (nom, courriel)…"
            search={(q) =>
              fetchMembers({ q: q || undefined, status: "active", limit: 20 }).then((r) => r.items)
            }
            keyOf={(m) => m.id}
            renderLabel={(m) => (
              <>
                {m.first_name} {m.last_name}
                {m.email && <span style={{ color: "var(--text-muted)" }}> ({m.email})</span>}
              </>
            )}
            onSelect={(member) => onChange({ mode: "membre", member })}
          />
        )
      )}

      {value.mode === "donateur" && (
        value.donor ? (
          <SelectedChip
            label={value.donor.name}
            clearLabel="Retirer le donateur sélectionné"
            onClear={() => onChange({ mode: "donateur", donor: null })}
          />
        ) : (
          <SearchPicker<Donor>
            placeholder="Rechercher un donateur (nom, courriel)…"
            search={(q) => searchDonors(q || undefined)}
            keyOf={(d) => d.id}
            renderLabel={(d) => (
              <>
                {d.name}
                {d.email && <span style={{ color: "var(--text-muted)" }}> ({d.email})</span>}
              </>
            )}
            onSelect={(donor) => onChange({ mode: "donateur", donor })}
            renderFooter={(query, searching) =>
              query.trim() ? (
                <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <input
                    className={styles.input}
                    type="email"
                    placeholder="Courriel (optionnel)"
                    style={{ flex: "1 1 160px" }}
                    value={newDonorEmail}
                    onChange={(e) => setNewDonorEmail(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.btnOutlineSm}
                    disabled={searching || creatingDonor}
                    onClick={() => addDonor(query)}
                  >
                    + Ajouter « {query.trim()} » comme nouveau donateur
                  </button>
                </div>
              ) : null
            }
          />
        )
      )}
    </div>
  );
}
