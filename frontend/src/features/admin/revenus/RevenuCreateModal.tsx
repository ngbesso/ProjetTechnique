import { useState } from "react";
import styles from "../AdminPage.module.css";
import { createManualDonation, uploadDonationAttachment } from "../../../lib/api/donations";
import { DonationFieldsGroup } from "./DonationFields";
import { DonorPicker } from "./DonorPicker";
import { emptyDonation } from "./donationDefaults";
import { ANONYMOUS_DONOR, donorPayload } from "./donorSelection";
import type { DonorSelection } from "./donorSelection";
import type { Church, DonationManualInput } from "../../../types";

interface RevenuCreateModalProps {
  churches: Church[];
  onClose: () => void;
  /** Appelé après un enregistrement réussi, pour rafraîchir liste et KPI. */
  onCreated: () => void;
}

/** Modale de saisie manuelle d'un don, d'une dîme ou d'une offrande. */
export function RevenuCreateModal({ churches, onClose, onCreated }: RevenuCreateModalProps) {
  const [form, setForm] = useState<DonationManualInput>(emptyDonation);
  const [donor, setDonor] = useState<DonorSelection>(ANONYMOUS_DONOR);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function update(patch: Partial<DonationManualInput>) {
    setForm((f) => ({ ...f, ...patch }));
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
        ...donorPayload(donor),
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
          <div className={styles.modalHeaderIcon} aria-hidden>💝</div>
          <div className={styles.modalHeaderText}>
            <h2 className={styles.modalName}>Nouveau revenu</h2>
            <span className={styles.modalSubtitle}>
              Saisie manuelle d'un don, d'une dîme ou d'une offrande.
            </span>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.modalBody}>
            <div className={styles.formGrid}>
              <DonationFieldsGroup
                values={{
                  amount: form.amount,
                  currency: form.currency,
                  contribution_type: form.contribution_type,
                  received_on: form.received_on,
                  category: form.category,
                  church_id: form.church_id,
                }}
                onChange={update}
                churches={churches}
              />

              <DonorPicker value={donor} onChange={setDonor} onError={setFormError} />

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--text-muted)" }}>
                  Pièce jointe (optionnel) — reçu, preuve de paiement…
                </label>
                <input type="file" onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)} />
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
