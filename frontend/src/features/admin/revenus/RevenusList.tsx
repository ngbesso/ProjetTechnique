import { useMemo, useState } from "react";
import styles from "../AdminPage.module.css";
import { DataTable, createColumnHelper } from "../../../components/ui/DataTable";
import {
  CATEGORY_LABELS,
  CONTRIBUTION_LABELS,
  STATUS_LABELS,
  downloadAttachment,
} from "./shared";
import type { DonationFilters } from "./shared";
import type { Donation } from "../../../types";

const col = createColumnHelper<Donation>();

interface RevenusListProps {
  donations: Donation[];
  /** Id du don dont la pièce jointe est en cours de téléversement, s'il y en a un. */
  uploadingId: number | null;
  onFiltersChange: (filters: DonationFilters) => void;
  onCreate: () => void;
  onAttach: (donationId: number, file: File) => void;
}

/** Carte « Revenus reçus » : recherche, filtres et tableau des dons. */
export function RevenusList({
  donations,
  uploadingId,
  onFiltersChange,
  onCreate,
  onAttach,
}: RevenusListProps) {
  const [filters, setFilters] = useState<DonationFilters>({});

  function updateFilters(patch: DonationFilters) {
    const next = { ...filters, ...patch };
    setFilters(next);
    onFiltersChange(next);
  }

  const total = donations.reduce((sum, d) => sum + d.amount, 0);

  const columns = useMemo(
    () => [
      col.accessor("created_at", {
        header: "Date",
        cell: (info) => new Date(info.getValue()).toLocaleDateString("fr-CA"),
      }),
      col.accessor((d) => d.donor_name ?? d.donor_email ?? "", {
        id: "donor",
        header: "Donateur",
        cell: (info) => {
          const d = info.row.original;
          return (
            <>
              <div>{d.donor_name ?? <em style={{ color: "var(--text-muted)" }}>Anonyme</em>}</div>
              {d.donor_email && (
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{d.donor_email}</div>
              )}
            </>
          );
        },
      }),
      col.accessor("contribution_type", {
        header: "Type",
        cell: (info) => CONTRIBUTION_LABELS[info.getValue()] ?? info.getValue(),
      }),
      col.accessor("amount", {
        header: "Montant",
        cell: (info) => (
          <>
            <strong>{info.getValue().toFixed(2)}</strong> {info.row.original.currency}
          </>
        ),
      }),
      col.accessor("category", {
        header: "Catégorie",
        cell: (info) => {
          const value = info.getValue();
          return value ? CATEGORY_LABELS[value] ?? value : <em style={{ color: "var(--text-muted)" }}>—</em>;
        },
      }),
      col.accessor("payment_status", {
        header: "Statut",
        cell: (info) => {
          const value = info.getValue();
          const badgeClass =
            value === "succeeded"
              ? styles.badgeActive
              : value === "failed"
              ? styles.badgeRejected
              : value === "pending"
              ? styles.badgePending
              : styles.badgeInactive;
          return (
            <span
              className={badgeClass}
              style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600 }}
            >
              {STATUS_LABELS[value] ?? value}
            </span>
          );
        },
      }),
      col.display({
        id: "attachment",
        header: "Pièce jointe",
        cell: (info) => {
          const d = info.row.original;
          if (d.attachment_url) {
            return (
              <button type="button" className={styles.btnOutlineSm} onClick={() => downloadAttachment(d)}>
                📎 {d.attachment_name ?? "Télécharger"}
              </button>
            );
          }
          return (
            <button
              type="button"
              className={styles.btnOutlineSm}
              disabled={uploadingId === d.id}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.onchange = () => {
                  const file = input.files?.[0];
                  if (file) onAttach(d.id, file);
                };
                input.click();
              }}
            >
              {uploadingId === d.id ? "…" : "+ Ajouter"}
            </button>
          );
        },
      }),
    ],
    [uploadingId, onAttach],
  );

  return (
    <section className={styles.listCard}>
      <div className={styles.listHeader}>
        <button type="button" className={styles.btnPrimary} onClick={onCreate}>
          + Nouveau revenu
        </button>
        <h3 className={styles.cardTitle} style={{ margin: 0 }}>
          Revenus reçus ({donations.length})
          {donations.length > 0 && (
            <span style={{ fontWeight: 400, fontSize: "0.9rem", marginLeft: "0.75rem", color: "var(--text-muted)" }}>
              · Total : {total.toFixed(2)} $
            </span>
          )}
        </h3>
      </div>

      <div className={styles.inlineForm} style={{ flexWrap: "wrap", marginBottom: "1rem", gap: "0.5rem" }}>
        <input
          className={styles.input}
          placeholder="Rechercher (nom, courriel, reçu)…"
          value={filters.q ?? ""}
          style={{ flex: "1 1 180px" }}
          onChange={(e) => updateFilters({ q: e.target.value })}
        />
        <select className={styles.select} value={filters.payment_status ?? ""}
          onChange={(e) => updateFilters({ payment_status: e.target.value })}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={styles.select} value={filters.category ?? ""}
          onChange={(e) => updateFilters({ category: e.target.value })}>
          <option value="">Toutes les catégories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={styles.select} value={filters.currency ?? ""}
          onChange={(e) => updateFilters({ currency: e.target.value })}>
          <option value="">Toutes les devises</option>
          <option value="CAD">CAD</option>
          <option value="USD">USD</option>
        </select>
      </div>

      <div className={styles.listBody}>
        <DataTable
          columns={columns}
          data={donations}
          getRowId={(d) => d.id}
          pageSize={10}
          emptyMessage="Aucun don enregistré."
        />
      </div>
    </section>
  );
}
