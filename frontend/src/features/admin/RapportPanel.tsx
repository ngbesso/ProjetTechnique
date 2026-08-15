import { useEffect, useMemo, useState } from "react";
import styles from "./AdminPage.module.css";
import { AnnualDonorReportView } from "./AnnualDonorReportView";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import {
  downloadFinanceReport,
  downloadTransactionAttachment,
  fetchFinanceReport,
} from "../../lib/api/finances";
import { CATEGORY_LABELS as DONATION_CATEGORY_LABELS } from "./revenus/donationLabels";
import { IconTrendingUp } from "../../components/ui/icons";
import { KpiCard } from "../../components/ui/KpiCard";
import type { FinancePeriod, FinanceReport, FinanceTransaction } from "../../types";

// Les dons stockent une catégorie sous forme de slug (soutien_spirituel...) ;
// les dépenses stockent déjà un libellé français lisible — rien à traduire
// de ce côté.
function categoryLabel(tx: FinanceTransaction): string {
  return tx.type === "revenu" ? (DONATION_CATEGORY_LABELS[tx.category] ?? tx.category) : tx.category;
}

interface CategoryGroup {
  key: string;
  category: string;
  type: FinanceTransaction["type"];
  currency: string;
  total: number;
  count: number;
}

/** Regroupe par (type, catégorie, devise) — jamais additionner CAD et USD
 * dans un même sous-total, sous peine de montant faux et trompeur. */
function groupByCategory(transactions: FinanceTransaction[]): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>();
  for (const t of transactions) {
    const category = categoryLabel(t);
    const key = `${t.type}::${category}::${t.currency}`;
    const existing = map.get(key);
    if (existing) {
      existing.total += t.amount;
      existing.count += 1;
    } else {
      map.set(key, { key, category, type: t.type, currency: t.currency, total: t.amount, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

// ── Icônes KPI ────────────────────────────────────────────────────────────────

function IconTrendingDown() {
  return (
    <svg viewBox="0 0 24 24">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

const PERIOD_LABELS: Record<FinancePeriod, string> = {
  day: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  year: "Cette année",
  custom: "Personnalisé",
};

function formatCad(amount: number): string {
  return amount.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 });
}

async function downloadAttachment(tx: FinanceTransaction) {
  if (!tx.attachment_url) return;
  const blob = await downloadTransactionAttachment(tx.attachment_url);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `piece-jointe-${tx.type}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const txCol = createColumnHelper<FinanceTransaction>();

export function RapportPanel() {
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<FinancePeriod | "">("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [viewMode, setViewMode] = useState<"globale" | "categories" | "annuel-donateurs">("globale");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroup | null>(null);

  // Regroupement calculé à partir des transactions déjà chargées : basculer
  // de vue est instantané, sans nouvel appel réseau ni rechargement de page.
  const categoryGroups = useMemo(
    () => (report ? groupByCategory(report.transactions) : []),
    [report],
  );
  const revenueGroups = categoryGroups.filter((g) => g.type === "revenu");
  const expenseGroups = categoryGroups.filter((g) => g.type === "dépense");

  // Détail d'une catégorie sélectionnée : recalculé à partir des transactions
  // déjà chargées, sans nouvel appel réseau.
  const selectedTransactions = useMemo(() => {
    if (!selectedGroup || !report) return [];
    return report.transactions.filter(
      (t) =>
        t.type === selectedGroup.type &&
        t.currency === selectedGroup.currency &&
        categoryLabel(t) === selectedGroup.category,
    );
  }, [selectedGroup, report]);

  function selectCategory(group: CategoryGroup) {
    setSelectedGroup((prev) => (prev?.key === group.key ? null : group));
  }

  function currentParams() {
    return period === "custom"
      ? { period: "custom" as const, start: customStart || undefined, end: customEnd || undefined }
      : period
      ? { period }
      : {};
  }

  function loadReport() {
    setLoading(true);
    setError("");
    fetchFinanceReport(currentParams())
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(loadReport, [period, customStart, customEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  // La catégorie sélectionnée ne doit pas survivre à un changement de
  // période (les transactions affichées ne correspondraient plus) ni à un
  // changement de vue.
  useEffect(() => setSelectedGroup(null), [report, viewMode]);

  async function handleExport(format: "pdf" | "excel" | "csv") {
    setExporting(true);
    setExportError("");
    try {
      const blob = await downloadFinanceReport(format, currentParams());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = format === "excel" ? "xlsx" : format;
      a.href = url;
      a.download = `rapport-financier.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Téléchargement impossible.");
    } finally {
      setExporting(false);
    }
  }

  const transactionColumns = [
    txCol.accessor("date", { header: "Date", cell: (info) => new Date(info.getValue()).toLocaleDateString("fr-CA") }),
    txCol.accessor("type", {
      header: "Type",
      cell: (info) => {
        const value = info.getValue();
        return (
          <span
            className={value === "revenu" ? styles.badgeActive : styles.badgeRejected}
            style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600 }}
          >
            {value === "revenu" ? "Revenu" : "Dépense"}
          </span>
        );
      },
    }),
    txCol.accessor("category", {
      header: "Catégorie",
      cell: (info) => categoryLabel(info.row.original),
    }),
    txCol.accessor("amount", {
      header: "Montant",
      cell: (info) => <><strong>{info.getValue().toFixed(2)}</strong> {info.row.original.currency}</>,
    }),
    txCol.accessor("party", { header: "Partie" }),
    txCol.accessor("note", { header: "Note / justification" }),
    txCol.display({
      id: "attachment",
      header: "Pièce jointe",
      cell: (info) => {
        const tx = info.row.original;
        return tx.attachment_url ? (
          <button type="button" className={styles.btnOutlineSm} onClick={() => downloadAttachment(tx)}>
            📎 Voir
          </button>
        ) : (
          <em style={{ color: "var(--text-muted)" }}>—</em>
        );
      },
    }),
  ];

  return (
    <div className={styles.rbacWrapper}>
      {error && <p className={styles.errorMsg} role="alert">{error}</p>}

      {report && (
        <div className={styles.kpiGrid}>
          <KpiCard color="emerald" icon={<IconTrendingUp />} value={formatCad(report.income_cad)} label="Revenus"
            sub={report.income_usd > 0 ? `+ ${report.income_usd.toFixed(2)} $ USD` : undefined} />
          <KpiCard color="rose" icon={<IconTrendingDown />} value={formatCad(report.expenses_total)} label="Dépenses" />
          <KpiCard color={report.balance >= 0 ? "blue" : "amber"} icon={<IconWallet />} value={formatCad(report.balance)} label="Solde disponible" />
        </div>
      )}

      <section className={styles.card}>
        <div className={styles.listHeader}>
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>Rapport financier</h3>
          {viewMode !== "annuel-donateurs" && (
            <div className={styles.actions}>
              <button className={styles.btnOutlineSm} disabled={exporting} onClick={() => handleExport("pdf")}>PDF</button>
              <button className={styles.btnOutlineSm} disabled={exporting} onClick={() => handleExport("excel")}>Excel</button>
              <button className={styles.btnOutlineSm} disabled={exporting} onClick={() => handleExport("csv")}>CSV</button>
            </div>
          )}
        </div>

        {viewMode !== "annuel-donateurs" && report && (
          <p style={{ fontSize: ".85rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
            Période du {report.period_start} au {report.period_end}
            {" · "}{report.income_count} revenu{report.income_count > 1 ? "s" : ""}
            {" · "}{report.expense_count} dépense{report.expense_count > 1 ? "s" : ""}
          </p>
        )}

        {viewMode !== "annuel-donateurs" && (
          <div className={styles.filterBar}>
            {(Object.keys(PERIOD_LABELS) as FinancePeriod[]).map((p) => (
              <button
                key={p}
                className={period === p ? styles.btnPrimary : styles.btnOutlineSm}
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
            <button className={period === "" ? styles.btnPrimary : styles.btnOutlineSm} onClick={() => setPeriod("")}>
              Historique complet
            </button>
          </div>
        )}

        {viewMode !== "annuel-donateurs" && period === "custom" && (
          <div className={styles.filterBar}>
            <input type="date" className={styles.input} value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            <input type="date" className={styles.input} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
        )}

        <div className={styles.filterBar}>
          <button
            className={viewMode === "globale" ? styles.btnPrimary : styles.btnOutlineSm}
            onClick={() => setViewMode("globale")}
          >
            Vue globale
          </button>
          <button
            className={viewMode === "categories" ? styles.btnPrimary : styles.btnOutlineSm}
            onClick={() => setViewMode("categories")}
          >
            Vue par catégories
          </button>
          <button
            className={viewMode === "annuel-donateurs" ? styles.btnPrimary : styles.btnOutlineSm}
            onClick={() => setViewMode("annuel-donateurs")}
          >
            Rapport annuel par donateur
          </button>
        </div>

        {exportError && <p className={styles.errorMsg} role="alert">{exportError}</p>}

        {viewMode === "annuel-donateurs" ? (
          <AnnualDonorReportView />
        ) : loading ? (
          <p className={styles.stateMsg}>Chargement…</p>
        ) : viewMode === "globale" ? (
          <div className={styles.listBody}>
            <DataTable
              columns={transactionColumns}
              data={report?.transactions ?? []}
              pageSize={10}
              emptyMessage="Aucune transaction sur cette période."
            />
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <CategoryGroupList
                title="Revenus"
                groups={revenueGroups}
                emptyMessage="Aucun revenu sur cette période."
                selectedKey={selectedGroup?.key}
                onSelect={selectCategory}
              />
              <CategoryGroupList
                title="Dépenses"
                groups={expenseGroups}
                emptyMessage="Aucune dépense sur cette période."
                selectedKey={selectedGroup?.key}
                onSelect={selectCategory}
              />
            </div>

            {selectedGroup && (
              <div style={{ marginTop: "1.5rem" }}>
                <div className={styles.listHeader}>
                  <h4 style={{ margin: 0 }}>
                    Détails — {selectedGroup.category}
                    <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                      {" "}({selectedGroup.type === "revenu" ? "Revenu" : "Dépense"}, {selectedGroup.currency})
                    </span>
                  </h4>
                  <button className={styles.btnOutlineSm} onClick={() => setSelectedGroup(null)}>
                    Fermer
                  </button>
                </div>
                <div className={styles.listBody}>
                  <DataTable
                    columns={transactionColumns}
                    data={selectedTransactions}
                    pageSize={10}
                    emptyMessage="Aucune transaction dans cette catégorie."
                  />
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function CategoryGroupList({
  title,
  groups,
  emptyMessage,
  selectedKey,
  onSelect,
}: {
  title: string;
  groups: CategoryGroup[];
  emptyMessage: string;
  selectedKey?: string;
  onSelect: (group: CategoryGroup) => void;
}) {
  return (
    <div>
      <h4 style={{ margin: "0 0 .6rem", fontSize: ".9rem", fontWeight: 700 }}>{title}</h4>
      {groups.length === 0 ? (
        <p className={styles.stateMsg}>{emptyMessage}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: ".4rem" }}>
          {groups.map((g) => {
            const selected = g.key === selectedKey;
            return (
              <li key={g.key}>
                <button
                  type="button"
                  onClick={() => onSelect(g)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: ".55rem .75rem",
                    background: selected ? "var(--primary-50, #ede9fe)" : "var(--neutral-bg)",
                    border: selected ? "1px solid var(--primary, #6d28d9)" : "1px solid transparent",
                    borderRadius: "var(--radius)",
                    cursor: "pointer",
                    font: "inherit",
                    color: "inherit",
                    textAlign: "left",
                  }}
                >
                  <span>
                    {g.category}{" "}
                    <span style={{ color: "var(--text-muted)", fontSize: ".78rem" }}>({g.count})</span>
                  </span>
                  <strong>{g.total.toFixed(2)} $ {g.currency}</strong>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
