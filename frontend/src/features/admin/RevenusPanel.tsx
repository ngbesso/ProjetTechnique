import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./AdminPage.module.css";
import {
  fetchAllDonations,
  fetchDonationsStats,
  createManualDonation,
  uploadDonationAttachment,
  downloadDonationAttachment,
} from "../../lib/api/donations";
import { useChurches } from "../../hooks/useChurches";
import type { Donation, DonationAdminStats, DonationManualInput } from "../../types";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import { KpiCard } from "../../components/ui/KpiCard";

const CATEGORY_LABELS: Record<string, string> = {
  soutien_spirituel: "Soutien spirituel",
  action_communautaire: "Action communautaire",
  developpement: "Développement",
};

const CONTRIBUTION_LABELS: Record<string, string> = {
  don: "Don",
  dime: "Dîme",
  offrande: "Offrande",
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

const EMPTY: DonationManualInput = {
  amount: 0,
  currency: "CAD",
  contribution_type: "don",
  received_on: new Date().toISOString().slice(0, 10),
};

async function downloadAttachment(donation: Donation) {
  const blob = await downloadDonationAttachment(donation.id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = donation.attachment_name ?? `piece-jointe-${donation.id}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const col = createColumnHelper<Donation>();

export function RevenusPanel() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCurrency, setFilterCurrency] = useState("");
  const [stats, setStats] = useState<DonationAdminStats | null>(null);
  const { churches, load: loadChurches } = useChurches();

  useEffect(() => {
    fetchDonationsStats().then(setStats).catch(() => {});
    loadChurches({ activeOnly: true });
  }, [loadChurches]);

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

  // ── Saisie manuelle ──
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<DonationManualInput>(EMPTY);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openCreateModal() {
    setForm(EMPTY);
    setAttachmentFile(null);
    setFormError("");
    setShowCreateModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || form.amount <= 0 || !form.contribution_type) {
      setFormError("Montant et type de contribution sont requis.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const created = await createManualDonation({
        ...form,
        church_id: form.church_id || undefined,
        donor_name: form.donor_name?.trim() || undefined,
        donor_email: form.donor_email?.trim() || undefined,
      });
      if (attachmentFile) {
        await uploadDonationAttachment(created.id, attachmentFile);
      }
      setShowCreateModal(false);
      fetchDonations();
      fetchDonationsStats().then(setStats).catch(() => {});
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  // ── Ajout d'une pièce jointe après coup (dons existants) ──
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  async function handleAttachExisting(donationId: number, file: File) {
    setUploadingId(donationId);
    try {
      const updated = await uploadDonationAttachment(donationId, file);
      setDonations((prev) => prev.map((d) => (d.id === donationId ? updated : d)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Téléversement impossible");
    } finally {
      setUploadingId(null);
    }
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
                  if (file) handleAttachExisting(d.id, file);
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
    [uploadingId],
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

      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          <button type="button" className={styles.btnPrimary} onClick={openCreateModal}>
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

      {/* ── Modale saisie manuelle ── */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "620px" }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderIcon}>💝</div>
              <div className={styles.modalHeaderText}>
                <h2 className={styles.modalName}>Nouveau revenu</h2>
                <span className={styles.modalSubtitle}>Saisie manuelle d'un don, d'une dîme ou d'une offrande.</span>
              </div>
              <button className={styles.modalClose} onClick={() => setShowCreateModal(false)} aria-label="Fermer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <input className={styles.input} type="number" step="0.01" min="0.01" placeholder="Montant *" required
                    value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
                  <select className={styles.select} value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value as DonationManualInput["currency"] })}>
                    <option value="CAD">CAD</option>
                    <option value="USD">USD</option>
                  </select>
                  <select className={styles.select} required value={form.contribution_type}
                    onChange={(e) => setForm({ ...form, contribution_type: e.target.value as DonationManualInput["contribution_type"] })}>
                    {Object.entries(CONTRIBUTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input className={styles.input} type="date" value={form.received_on}
                    onChange={(e) => setForm({ ...form, received_on: e.target.value })} />
                  <select className={styles.select} value={form.category ?? ""}
                    onChange={(e) => setForm({ ...form, category: (e.target.value || undefined) as DonationManualInput["category"] })}>
                    <option value="">Catégorie (optionnel)</option>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select className={styles.select} value={form.church_id ?? ""}
                    onChange={(e) => setForm({ ...form, church_id: e.target.value ? Number(e.target.value) : undefined })}>
                    <option value="">Église (optionnel)</option>
                    {churches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input className={styles.input} placeholder="Nom du donateur (optionnel)"
                    value={form.donor_name ?? ""} onChange={(e) => setForm({ ...form, donor_name: e.target.value })} />
                  <input className={styles.input} type="email" placeholder="Courriel du donateur (optionnel)"
                    value={form.donor_email ?? ""} onChange={(e) => setForm({ ...form, donor_email: e.target.value })} />

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--text-muted)" }}>
                      Pièce jointe (optionnel) — reçu, preuve de paiement…
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                    />
                    {attachmentFile && (
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                        {attachmentFile.name}
                      </p>
                    )}
                  </div>
                </div>
                {formError && (
                  <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>{formError}</p>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setShowCreateModal(false)} disabled={saving}>
                  Annuler
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? "Enregistrement…" : "+ Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
