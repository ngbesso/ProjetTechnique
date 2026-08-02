import { useRef, useState } from "react";
import styles from "../AdminPage.module.css";
import { createManualDonation, uploadDonationAttachment } from "../../../lib/api/donations";
import { createDonor, searchDonors } from "../../../lib/api/donors";
import { fetchMembers } from "../../../lib/api/members";
import { CATEGORY_LABELS, CONTRIBUTION_LABELS, emptyDonation } from "./shared";
import type { Church, DonationManualInput, Donor, Member } from "../../../types";

/** Le donateur est soit anonyme (saisi en texte libre), soit un membre
 *  existant, soit un donateur enregistré. */
type DonorMode = "anonyme" | "membre" | "donateur";

interface RevenuCreateModalProps {
  churches: Church[];
  onClose: () => void;
  /** Appelé après un enregistrement réussi, pour rafraîchir liste et KPI. */
  onCreated: () => void;
}

/** Modale de saisie manuelle d'un don, d'une dîme ou d'une offrande. */
export function RevenuCreateModal({ churches, onClose, onCreated }: RevenuCreateModalProps) {
  const [form, setForm] = useState<DonationManualInput>(emptyDonation);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [donorMode, setDonorMode] = useState<DonorMode>("anonyme");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberSearching, setMemberSearching] = useState(false);
  const [donorQuery, setDonorQuery] = useState("");
  const [donorResults, setDonorResults] = useState<Donor[]>([]);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [donorSearching, setDonorSearching] = useState(false);
  const [donorEmailForNew, setDonorEmailForNew] = useState("");

  function switchDonorMode(mode: DonorMode) {
    setDonorMode(mode);
    setSelectedMember(null);
    setSelectedDonor(null);
    setForm((f) => ({ ...f, donor_name: "", donor_email: "" }));
  }

  function searchMembers() {
    setMemberSearching(true);
    fetchMembers({ q: memberQuery || undefined, status: "active", limit: 20 })
      .then((res) => setMemberResults(res.items))
      .catch(() => setMemberResults([]))
      .finally(() => setMemberSearching(false));
  }

  function searchDonorsList() {
    setDonorSearching(true);
    searchDonors(donorQuery || undefined)
      .then(setDonorResults)
      .catch(() => setDonorResults([]))
      .finally(() => setDonorSearching(false));
  }

  async function handleCreateDonor() {
    if (!donorQuery.trim()) return;
    setDonorSearching(true);
    try {
      const created = await createDonor({
        name: donorQuery.trim(),
        email: donorEmailForNew.trim() || undefined,
      });
      setSelectedDonor(created);
      setDonorResults([]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Impossible de créer le donateur");
    } finally {
      setDonorSearching(false);
    }
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
        member_id: donorMode === "membre" ? selectedMember?.id : undefined,
        donor_id: donorMode === "donateur" ? selectedDonor?.id : undefined,
        donor_name: donorMode === "anonyme" ? form.donor_name?.trim() || undefined : undefined,
        donor_email: donorMode === "anonyme" ? form.donor_email?.trim() || undefined : undefined,
      });
      if (attachmentFile) {
        await uploadDonationAttachment(created.id, attachmentFile);
      }
      onCreated();
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "620px" }}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderIcon}>💝</div>
          <div className={styles.modalHeaderText}>
            <h2 className={styles.modalName}>Nouveau revenu</h2>
            <span className={styles.modalSubtitle}>Saisie manuelle d'un don, d'une dîme ou d'une offrande.</span>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">✕</button>
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
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--text-muted)" }}>
                  Donateur
                </label>
                <div className={styles.inlineForm} style={{ gap: "0.4rem", marginBottom: "0.5rem" }}>
                  <button type="button" className={donorMode === "anonyme" ? styles.btnPrimary : styles.btnOutlineSm} onClick={() => switchDonorMode("anonyme")}>
                    Anonyme
                  </button>
                  <button type="button" className={donorMode === "membre" ? styles.btnPrimary : styles.btnOutlineSm} onClick={() => switchDonorMode("membre")}>
                    Membre
                  </button>
                  <button type="button" className={donorMode === "donateur" ? styles.btnPrimary : styles.btnOutlineSm} onClick={() => switchDonorMode("donateur")}>
                    Donateur
                  </button>
                </div>

                {donorMode === "anonyme" && (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <input className={styles.input} placeholder="Nom du donateur (optionnel)" style={{ flex: "1 1 200px" }}
                      value={form.donor_name ?? ""} onChange={(e) => setForm({ ...form, donor_name: e.target.value })} />
                    <input className={styles.input} type="email" placeholder="Courriel du donateur (optionnel)" style={{ flex: "1 1 200px" }}
                      value={form.donor_email ?? ""} onChange={(e) => setForm({ ...form, donor_email: e.target.value })} />
                  </div>
                )}

                {donorMode === "membre" && (
                  selectedMember ? (
                    <span className={styles.badge}>
                      {selectedMember.first_name} {selectedMember.last_name}
                      <button type="button" className={styles.chipX} onClick={() => setSelectedMember(null)}>×</button>
                    </span>
                  ) : (
                    <>
                      <div className={styles.inlineForm} style={{ gap: "0.4rem" }}>
                        <input className={styles.input} placeholder="Rechercher un membre (nom, courriel)…"
                          value={memberQuery}
                          onChange={(e) => setMemberQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchMembers(); } }} />
                        <button type="button" className={styles.btnOutlineSm} disabled={memberSearching} onClick={searchMembers}>
                          {memberSearching ? "…" : "Rechercher"}
                        </button>
                      </div>
                      {memberResults.length > 0 && (
                        <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0", display: "flex", flexDirection: "column", gap: "0.25rem", maxHeight: "160px", overflowY: "auto" }}>
                          {memberResults.map((m) => (
                            <li key={m.id}>
                              <button type="button" className={styles.btnOutlineSm} style={{ width: "100%", textAlign: "left" }}
                                onClick={() => { setSelectedMember(m); setMemberResults([]); }}>
                                {m.first_name} {m.last_name}{m.email && <span style={{ color: "var(--text-muted)" }}> ({m.email})</span>}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )
                )}

                {donorMode === "donateur" && (
                  selectedDonor ? (
                    <span className={styles.badge}>
                      {selectedDonor.name}
                      <button type="button" className={styles.chipX} onClick={() => setSelectedDonor(null)}>×</button>
                    </span>
                  ) : (
                    <>
                      <div className={styles.inlineForm} style={{ gap: "0.4rem" }}>
                        <input className={styles.input} placeholder="Rechercher un donateur (nom, courriel)…"
                          value={donorQuery}
                          onChange={(e) => setDonorQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchDonorsList(); } }} />
                        <button type="button" className={styles.btnOutlineSm} disabled={donorSearching} onClick={searchDonorsList}>
                          {donorSearching ? "…" : "Rechercher"}
                        </button>
                      </div>
                      {donorResults.length > 0 && (
                        <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0", display: "flex", flexDirection: "column", gap: "0.25rem", maxHeight: "160px", overflowY: "auto" }}>
                          {donorResults.map((d) => (
                            <li key={d.id}>
                              <button type="button" className={styles.btnOutlineSm} style={{ width: "100%", textAlign: "left" }}
                                onClick={() => { setSelectedDonor(d); setDonorResults([]); }}>
                                {d.name}{d.email && <span style={{ color: "var(--text-muted)" }}> ({d.email})</span>}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {donorQuery.trim() && (
                        <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                          <input className={styles.input} type="email" placeholder="Courriel (optionnel)" style={{ flex: "1 1 160px" }}
                            value={donorEmailForNew} onChange={(e) => setDonorEmailForNew(e.target.value)} />
                          <button type="button" className={styles.btnOutlineSm} disabled={donorSearching} onClick={handleCreateDonor}>
                            + Ajouter « {donorQuery.trim()} » comme nouveau donateur
                          </button>
                        </div>
                      )}
                    </>
                  )
                )}
              </div>

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
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Enregistrement…" : "+ Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
