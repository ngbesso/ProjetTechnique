import { useEffect, useMemo } from "react";
import styles from "./AdminPage.module.css";
import { fetchAllDonations, fetchDonationsStats } from "../../lib/api/donations";
import { useState } from "react";
import type { Donation, DonationAdminStats } from "../../types";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import { KpiCard } from "../../components/ui/KpiCard";

const CATEGORY_LABELS: Record<string, string> = {
  soutien_spirituel: "Soutien spirituel",
  action_communautaire: "Action communautaire",
  developpement: "Développement",
};

// ── Icônes KPI ────────────────────────────────────────────────────────────────

function IconDollar() {
  return (
    <svg viewBox="0 0 24 24">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconTrendingUp() {
  return (
    <svg viewBox="0 0 24 24">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function formatCad(amount: number): string {
  return amount.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 });
}

const STATUS_LABELS: Record<string, string> = {
  manual: "Manuel",
  succeeded: "Réussi",
  pending: "En attente",
  failed: "Échoué",
};

const col = createColumnHelper<Donation>();

export function DonsPanel() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCurrency, setFilterCurrency] = useState("");
  const [stats, setStats] = useState<DonationAdminStats | null>(null);

  useEffect(() => {
    fetchDonationsStats().then(setStats).catch(() => {});
  }, []);

  function fetchDonations(overrides?: Record<string, string>) {
    setLoading(true);
    setError("");
    fetchAllDonations({
      q: (overrides?.q ?? q).trim() || undefined,
      payment_status: (overrides?.payment_status ?? filterStatus) || undefined,
      category: (overrides?.category ?? filterCategory) || undefined,
      currency: (overrides?.currency ?? filterCurrency) || undefined,
    })
      .then(setDonations)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchDonations(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      col.accessor("receipt_number", {
        header: "Reçu",
        cell: (info) => (
          <span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{info.getValue()}</span>
        ),
      }),
    ],
    []
  );

  if (loading) return <p className={styles.stateMsg}>Chargement…</p>;

  return (
    <div className={styles.rbacWrapper}>
      {error && (
        <p className={styles.errorMsg} role="alert">
          {error}
        </p>
      )}

      {stats && (
        <>
          <div className={styles.kpiGrid}>
            <KpiCard
              color="violet"
              icon={<IconDollar />}
              value={formatCad(stats.total_cad)}
              label="Montant total"
              sub={stats.total_usd > 0 ? `+ ${stats.total_usd.toFixed(2)} $ USD` : undefined}
            />
            {stats.by_category.map((c, i) => (
              <KpiCard
                key={c.category}
                color={i === 0 ? "amber" : i === 1 ? "emerald" : "blue"}
                icon={
                  c.category === "soutien_spirituel" ? <IconHeart /> :
                  c.category === "action_communautaire" ? <IconUsers /> :
                  <IconTrendingUp />
                }
                value={c.count}
                label={CATEGORY_LABELS[c.category] ?? c.category}
              />
            ))}
          </div>

          <div className={styles.topListsGrid}>
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Top 5 donateurs</h3>
              {stats.top_donors.length === 0 ? (
                <p className={styles.empty}>Aucun don enregistré.</p>
              ) : (
                stats.top_donors.map((d, i) => (
                  <div key={`${d.name}-${i}`} className={styles.topListRow}>
                    <span className={i === 0 ? `${styles.topListRank} ${styles.topListRankFirst}` : styles.topListRank}>
                      {i + 1}
                    </span>
                    <div className={styles.topListBody}>
                      <span className={styles.topListName}>{d.name}</span>
                      <span className={styles.topListValue}>
                        {formatCad(d.total)} · {d.count} don{d.count > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </section>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Top églises</h3>
              {stats.top_churches.length === 0 ? (
                <p className={styles.empty}>Aucun don enregistré.</p>
              ) : (
                stats.top_churches.map((c, i) => (
                  <div key={c.church_id} className={styles.topListRow}>
                    <span className={i === 0 ? `${styles.topListRank} ${styles.topListRankFirst}` : styles.topListRank}>
                      {i + 1}
                    </span>
                    <div className={styles.topListBody}>
                      <span className={styles.topListName}>{c.church_name}</span>
                      <span className={styles.topListValue}>{formatCad(c.total)}</span>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        </>
      )}

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>
          Dons reçus ({donations.length})
          {donations.length > 0 && (
            <span style={{ fontWeight: 400, fontSize: "0.9rem", marginLeft: "0.75rem", color: "var(--text-muted)" }}>
              · Total : {total.toFixed(2)} $
            </span>
          )}
        </h3>

        <div className={styles.inlineForm} style={{ flexWrap: "wrap", marginBottom: "1rem", gap: "0.5rem" }}>
          <input
            className={styles.input}
            placeholder="Rechercher (nom, courriel, reçu)…"
            value={q}
            style={{ flex: "1 1 180px" }}
            onChange={(e) => { setQ(e.target.value); fetchDonations({ q: e.target.value }); }}
          />
          <select className={styles.select} value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); fetchDonations({ payment_status: e.target.value }); }}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={styles.select} value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); fetchDonations({ category: e.target.value }); }}>
            <option value="">Toutes les catégories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={styles.select} value={filterCurrency}
            onChange={(e) => { setFilterCurrency(e.target.value); fetchDonations({ currency: e.target.value }); }}>
            <option value="">Toutes les devises</option>
            <option value="CAD">CAD</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <DataTable
          columns={columns}
          data={donations}
          getRowId={(d) => d.id}
          pageSize={10}
          emptyMessage="Aucun don enregistré."
        />
      </section>
    </div>
  );
}
