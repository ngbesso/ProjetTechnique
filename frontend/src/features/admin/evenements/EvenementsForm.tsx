import { useEffect, useRef, useState } from "react";
import styles from "../EvenementsPanel.module.css";
import { Button } from "../../../components/ui/Button";
import { Field } from "../../../components/ui/Field";
import {
  DEFAULT_CANCEL_DEADLINE_HOURS,
  DEFAULT_CONFIRMATION_MESSAGE,
  DEFAULT_REMINDER_MESSAGE,
  FORMAT_LABELS,
  STATUS_LABELS,
  churchLabel,
  formatLocalDateTime,
  formatPrice,
  renderMessagePreview,
  toIso,
  toLocalInput,
} from "./shared";
import type { Church, District, EventFormat, EventInput, EventStatus, ParameterValue } from "../../../types";

type StepId = "info" | "date" | "details" | "messages" | "images" | "review";

const STEPS: { id: StepId; label: string }[] = [
  { id: "info", label: "Informations" },
  { id: "date", label: "Date & Lieu" },
  { id: "details", label: "Détails" },
  { id: "messages", label: "Rappels" },
  { id: "images", label: "Images" },
  { id: "review", label: "Révision" },
];

/** Interrupteur on/off — même rendu que celui d'origine, factorisé car
 *  utilisé par « inscrits visibles » et « auto-approbation des bénévoles ». */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 48,
        height: 26,
        borderRadius: 999,
        border: "none",
        background: checked ? "var(--vivid-violet)" : "#d1d5db",
        cursor: "pointer",
        position: "relative",
        transition: "background .2s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 25 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,.3)",
          transition: "left .2s",
        }}
      />
    </button>
  );
}

function StepProgress({ current }: { current: number }) {
  return (
    <div className={styles.stepProgress}>
      {STEPS.map((s, i) => (
        <div key={s.id} className={styles.stepItem}>
          <div className={styles.stepDotCol}>
            <div
              className={`${styles.stepDot} ${i === current ? styles.stepDotActive : ""} ${i < current ? styles.stepDotDone : ""}`}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span className={i === current ? `${styles.stepLabel} ${styles.stepLabelActive}` : styles.stepLabel}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`${styles.stepLine} ${i < current ? styles.stepLineDone : ""}`} />
          )}
        </div>
      ))}
    </div>
  );
}

interface EvenementsFormProps {
  initialValue: EventInput;
  initialImageUrl: string | null;
  isEditing: boolean;
  churches: Church[];
  districtValues: ParameterValue[];
  categoryValues: ParameterValue[];
  intervenantCategoryValues: ParameterValue[];
  onSubmit: (payload: EventInput, imageFile: File | null) => Promise<void>;
  onCancel: () => void;
}

export function EvenementsForm({
  initialValue,
  initialImageUrl,
  isEditing,
  churches,
  districtValues,
  categoryValues,
  intervenantCategoryValues,
  onSubmit,
  onCancel,
}: EvenementsFormProps) {
  const [form, setForm] = useState<EventInput>(initialValue);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl);
  const isLastStep = step === STEPS.length - 1;

  // Révoque l'URL blob à la fermeture (annulation ou soumission réussie —
  // le parent démonte ce composant dans les deux cas) : ref pour toujours
  // révoquer la dernière preview, pas celle capturée au montage.
  const imagePreviewRef = useRef(imagePreview);
  imagePreviewRef.current = imagePreview;
  useEffect(() => {
    return () => {
      if (imagePreviewRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewRef.current);
      }
    };
  }, []);

  function handleCancel() {
    if (imagePreview && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    onCancel();
  }

  function validateStep(currentStep: number): string | null {
    if (currentStep === 0 && !form.title.trim()) return "Le titre est requis.";
    if (currentStep === 0 && !form.category) return "La catégorie est requise.";
    if (currentStep === 1 && !form.date_start) return "La date de début est requise.";
    if (
      currentStep === 1 &&
      (form.format === "en_ligne" || form.format === "hybride") &&
      !form.online_link?.trim()
    ) {
      return "Le lien de connexion est requis pour un événement en ligne ou hybride.";
    }
    if (currentStep === 1 && form.format === "hybride" && !form.location?.trim()) {
      return "Le lieu est requis pour un événement hybride.";
    }
    return null;
  }

  function goPrev() {
    setFormError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const stepError = validateStep(step);
    if (stepError) {
      setFormError(stepError);
      return;
    }
    setFormError("");

    if (!isLastStep) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        date_start: toIso(form.date_start)!,
        date_end: toIso(form.date_end ?? "") ?? null,
        description: form.description || undefined,
        location: form.location || undefined,
        instructor: form.instructor || undefined,
      };
      await onSubmit(payload, imageFile);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={handleCancel}>
      <div className={styles.formCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.formHeader}>
          <div className={styles.formHeaderIcon}>{isEditing ? "✏️" : "📅"}</div>
          <div>
            <p className={styles.formHeaderTitle}>
              {isEditing ? "Modifier l'événement" : "Créer un événement"}
            </p>
            <p className={styles.formHeaderSub}>
              {isEditing
                ? "Modifiez les informations ci-dessous puis enregistrez."
                : "Remplissez les informations du nouvel événement."}
            </p>
          </div>
          <button type="button" className={styles.formHeaderClose} onClick={handleCancel} aria-label="Fermer">
            ✕
          </button>
        </div>

        <StepProgress current={step} />

        <form onSubmit={handleSubmit} className={styles.formBody}>
          {STEPS[step].id === "info" && (
            <div className={styles.grid2}>
              <div className={styles.fullWidth}>
                <Field label="Titre *">
                  <input
                    className={styles.input}
                    placeholder="ex. : Camp de jeunes d'été"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Catégorie *">
                <select
                  className={styles.select}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="" disabled>Sélectionner…</option>
                  {categoryValues.map((c) => (
                    <option key={c.id} value={c.label}>{c.label}</option>
                  ))}
                </select>
              </Field>

              <div className={styles.fullWidth}>
                <Field label="Description">
                  <textarea
                    className={styles.textarea}
                    placeholder="Description de l'événement (optionnel)"
                    value={form.description ?? ""}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          )}

          {STEPS[step].id === "date" && (
            <div className={styles.grid2}>
              <Field label="Date de début *">
                <input
                  className={styles.input}
                  type="datetime-local"
                  required
                  min={isEditing ? undefined : toLocalInput(new Date().toISOString())}
                  value={form.date_start}
                  onChange={(e) => setForm({ ...form, date_start: e.target.value })}
                />
              </Field>

              <Field label="Date de fin">
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={form.date_end ?? ""}
                  onChange={(e) => setForm({ ...form, date_end: e.target.value })}
                />
              </Field>

              <Field label="Format">
                <select
                  className={styles.select}
                  value={form.format ?? "presentiel"}
                  onChange={(e) =>
                    setForm({ ...form, format: e.target.value as EventFormat })
                  }
                >
                  {(Object.keys(FORMAT_LABELS) as EventFormat[]).map((f) => (
                    <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
                  ))}
                </select>
              </Field>

              {(form.format === "en_ligne" || form.format === "hybride") && (
                <div className={form.format === "hybride" ? undefined : styles.fullWidth}>
                  <Field label="Lien de connexion *">
                    <input
                      className={styles.input}
                      placeholder="ex. : https://zoom.us/j/123456789"
                      value={form.online_link ?? ""}
                      onChange={(e) => setForm({ ...form, online_link: e.target.value })}
                    />
                  </Field>
                </div>
              )}
              {(form.format === "presentiel" || form.format === "hybride") && (
                <div className={form.format === "hybride" ? undefined : styles.fullWidth}>
                  <Field label="Lieu *">
                    <input
                      className={styles.input}
                      placeholder="ex. : Centre de plein air, Sainte-Adèle"
                      value={form.location ?? ""}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                    />
                  </Field>
                </div>
              )}

              <Field label="Église organisatrice">
                <select
                  className={styles.select}
                  value={form.church_id ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, church_id: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <option value="">Toute la mission</option>
                  {churches.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="District">
                <select
                  className={styles.select}
                  value={form.district ?? ""}
                  onChange={(e) => setForm({ ...form, district: (e.target.value || null) as District | null })}
                >
                  <option value="">Aucun district</option>
                  {districtValues.map((d) => (
                    <option key={d.id} value={d.label}>{d.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {STEPS[step].id === "details" && (
            <div className={styles.grid2}>
              <Field label="Formateur / animateur">
                <input
                  className={styles.input}
                  placeholder="Surtout pour les formations"
                  value={form.instructor ?? ""}
                  onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                />
              </Field>

              <Field label="Catégorie d'intervenant">
                <select
                  className={styles.select}
                  value={form.intervenant_category ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, intervenant_category: e.target.value || null })
                  }
                >
                  <option value="">Aucune</option>
                  {intervenantCategoryValues.map((c) => (
                    <option key={c.id} value={c.label}>{c.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Prix (CAD) — 0 = gratuit">
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price ?? 0}
                  onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : 0 })}
                />
              </Field>

              {(form.price ?? 0) > 0 && (
                <div className={styles.fullWidth}>
                  <Field label="Chemin du formulaire Zeffy *">
                    <input
                      className={styles.input}
                      placeholder="ex. : /fr/donation-form/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={form.zeffy_form_path ?? ""}
                      onChange={(e) => setForm({ ...form, zeffy_form_path: e.target.value })}
                    />
                  </Field>
                  <p className={styles.imageHint}>
                    Requis pour un événement payant — sinon, les visiteurs verront un message
                    indiquant que le paiement n'est pas encore configuré.
                  </p>
                </div>
              )}

              <Field label="Places maximum">
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  placeholder="Vide = illimité"
                  value={form.capacity ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      capacity: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </Field>

              <Field label="Nombre d'inscrits visible publiquement">
                <Toggle
                  checked={form.show_registration_count ?? true}
                  onChange={(v) => setForm({ ...form, show_registration_count: v })}
                />
              </Field>

              <Field label="Statut">
                <select
                  className={styles.select}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}
                >
                  {(Object.keys(STATUS_LABELS) as EventStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </Field>

              <div className={styles.fullWidth}>
                <p className={styles.imageHint} style={{ fontWeight: 600, marginBottom: 0 }}>
                  Bénévolat
                </p>
              </div>

              <Field label="Nombre de bénévoles souhaité">
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  placeholder="Vide = pas de recherche de bénévoles"
                  value={form.volunteer_capacity ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      volunteer_capacity: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </Field>

              <Field label="Approuver automatiquement les bénévoles">
                <Toggle
                  checked={form.volunteer_auto_approve ?? false}
                  onChange={(v) => setForm({ ...form, volunteer_auto_approve: v })}
                />
              </Field>

              <div className={styles.fullWidth}>
                <Field label="Message de l'annonce aux membres">
                  <textarea
                    className={styles.textarea}
                    placeholder="Texte envoyé aux membres pour annoncer la recherche de bénévoles (optionnel)"
                    value={form.volunteer_message ?? ""}
                    onChange={(e) => setForm({ ...form, volunteer_message: e.target.value })}
                  />
                </Field>
                <p className={styles.imageHint}>
                  L'annonce part automatiquement aux membres de l'église organisatrice
                  à la publication d'un événement cherchant des bénévoles. Au-delà de
                  la capacité, les demandes passent en liste d'attente.
                </p>
              </div>
            </div>
          )}

          {STEPS[step].id === "messages" && (
            <div className={styles.grid2}>
              <Field label="Délai d'annulation (heures avant l'événement)">
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  value={form.cancel_deadline_hours ?? DEFAULT_CANCEL_DEADLINE_HOURS}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cancel_deadline_hours: e.target.value ? Number(e.target.value) : 0,
                    })
                  }
                />
              </Field>

              <div className={styles.fullWidth}>
                <Field label="Message de confirmation d'inscription">
                  <textarea
                    className={styles.textarea}
                    placeholder={DEFAULT_CONFIRMATION_MESSAGE}
                    value={form.confirmation_message ?? ""}
                    onChange={(e) => setForm({ ...form, confirmation_message: e.target.value })}
                  />
                </Field>
                <p className={styles.imageHint}>
                  Variables disponibles : {"{prenom}"}, {"{titre}"}, {"{date}"}, {"{delai}"}
                </p>
                {form.confirmation_message && (
                  <p className={styles.imageHint}>
                    <strong>Aperçu :</strong> {renderMessagePreview(form.confirmation_message, form)}
                  </p>
                )}
              </div>

              <div className={styles.fullWidth}>
                <Field label="Message de rappel">
                  <textarea
                    className={styles.textarea}
                    placeholder={DEFAULT_REMINDER_MESSAGE}
                    value={form.reminder_message ?? ""}
                    onChange={(e) => setForm({ ...form, reminder_message: e.target.value })}
                  />
                </Field>
                <p className={styles.imageHint}>
                  Variables disponibles : {"{prenom}"}, {"{titre}"}, {"{date}"}, {"{delai}"}
                </p>
                {form.reminder_message && (
                  <p className={styles.imageHint}>
                    <strong>Aperçu :</strong> {renderMessagePreview(form.reminder_message, form)}
                  </p>
                )}
              </div>
            </div>
          )}

          {STEPS[step].id === "images" && (
            <div className={styles.imageStepBody}>
              <Field label="Image de couverture">
                <input
                  type="file"
                  accept="image/*"
                  className={styles.input}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (imagePreview && imagePreview.startsWith("blob:")) {
                      URL.revokeObjectURL(imagePreview);
                    }
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }}
                />
              </Field>
              {imagePreview ? (
                <div className={styles.imagePreviewWrap}>
                  <img src={imagePreview} alt="Aperçu de l'image de couverture" className={styles.imagePreview} />
                </div>
              ) : (
                <p className={styles.imageHint}>Aucune image sélectionnée — formats acceptés : JPG, PNG, WebP.</p>
              )}
              {imageFile && (
                <p className={styles.imageHint}>Cette image sera envoyée lors de l'enregistrement.</p>
              )}
            </div>
          )}

          {STEPS[step].id === "review" && (
            <div className={styles.reviewList}>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Titre</span>
                <span className={styles.reviewValue}>{form.title || "—"}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Catégorie</span>
                <span className={styles.reviewValue}>{form.category || "—"}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Description</span>
                <span className={styles.reviewValue}>{form.description || "—"}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Date de début</span>
                <span className={styles.reviewValue}>{formatLocalDateTime(form.date_start)}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Date de fin</span>
                <span className={styles.reviewValue}>{formatLocalDateTime(form.date_end)}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Format</span>
                <span className={styles.reviewValue}>{FORMAT_LABELS[form.format ?? "presentiel"]}</span>
              </div>
              {(form.format === "presentiel" || form.format === "hybride") && (
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Lieu</span>
                  <span className={styles.reviewValue}>{form.location || "—"}</span>
                </div>
              )}
              {(form.format === "en_ligne" || form.format === "hybride") && (
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Lien de connexion</span>
                  <span className={styles.reviewValue}>{form.online_link || "—"}</span>
                </div>
              )}
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Église organisatrice</span>
                <span className={styles.reviewValue}>{churchLabel(churches, form.church_id ?? null)}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>District</span>
                <span className={styles.reviewValue}>{form.district || "—"}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Formateur</span>
                <span className={styles.reviewValue}>{form.instructor || "—"}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Catégorie d'intervenant</span>
                <span className={styles.reviewValue}>{form.intervenant_category || "—"}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Prix</span>
                <span className={styles.reviewValue}>{formatPrice(form.price ?? 0)}</span>
              </div>
              {(form.price ?? 0) > 0 && (
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Formulaire Zeffy</span>
                  <span className={styles.reviewValue}>{form.zeffy_form_path || "—"}</span>
                </div>
              )}
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Places maximum</span>
                <span className={styles.reviewValue}>{form.capacity ?? "Illimité"}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Nombre d'inscrits visible publiquement</span>
                <span className={styles.reviewValue}>
                  {(form.show_registration_count ?? true) ? "Oui" : "Non"}
                </span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Statut</span>
                <span className={styles.reviewValue}>{STATUS_LABELS[form.status ?? "draft"]}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Délai d'annulation</span>
                <span className={styles.reviewValue}>
                  {form.cancel_deadline_hours ?? DEFAULT_CANCEL_DEADLINE_HOURS} h avant l'événement
                </span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Bénévoles souhaités</span>
                <span className={styles.reviewValue}>
                  {form.volunteer_capacity
                    ? `${form.volunteer_capacity}${
                        form.volunteer_auto_approve ? " — approbation automatique" : ""
                      }`
                    : "Aucune recherche de bénévoles"}
                </span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Image de couverture</span>
                <span className={styles.reviewValue}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="" className={styles.reviewImageThumb} />
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>
          )}

          {formError && (
            <div className={styles.errorBanner} role="alert">
              <span className={styles.errorBannerIcon}>⚠</span>
              <span>{formError}</span>
            </div>
          )}

          <div className={styles.formActions}>
            {step > 0 && (
              <Button type="button" variant="outline" onClick={goPrev} disabled={saving}>
                ← Précédent
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={handleCancel} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving
                ? "Enregistrement…"
                : !isLastStep
                ? "Suivant →"
                : isEditing
                ? "✓ Enregistrer les modifications"
                : "+ Créer l'événement"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
