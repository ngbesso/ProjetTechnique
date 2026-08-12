import { useEffect, useRef, useState } from "react";
import styles from "../EvenementsPanel.module.css";
import { Button } from "../../../components/ui/Button";
import { toIso } from "../../../lib/format";
import { withDefaults } from "./eventDefaults";
import type { EventFormValues } from "./eventDefaults";
import { LAST_STEP_INDEX, STEPS } from "./eventFormSteps";
import { validateStep } from "./eventValidation";
import { EventStepProgress } from "./EventStepProgress";
import { EventStepInfo } from "./EventStepInfo";
import { EventStepDate } from "./EventStepDate";
import { EventStepDetails } from "./EventStepDetails";
import { EventStepMessages } from "./EventStepMessages";
import { EventStepImages } from "./EventStepImages";
import { EventStepReview } from "./EventStepReview";
import type { Church, EventInput, ParameterValue } from "../../../types";

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
  const isLastStep = step === LAST_STEP_INDEX;
  const stepId = STEPS[step].id;

  // Les champs facultatifs sont résolus une seule fois : les étapes lisent
  // ensuite une valeur sûre, sans répéter `?? défaut` à chaque usage.
  const values = withDefaults(form);

  /** Mise à jour partielle ; chaque étape n'en voit que sa propre restriction. */
  function update(patch: Partial<EventFormValues>) {
    setForm((f) => ({ ...f, ...patch }));
  }

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

  function handleSelectFile(file: File) {
    if (imagePreview && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function goPrev() {
    setFormError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const stepError = validateStep(stepId, values);
    if (stepError) {
      setFormError(stepError);
      return;
    }
    setFormError("");

    if (!isLastStep) {
      setStep((s) => Math.min(s + 1, LAST_STEP_INDEX));
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
          <div className={styles.formHeaderIcon} aria-hidden>{isEditing ? "✏️" : "📅"}</div>
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

        <EventStepProgress current={step} />

        <form onSubmit={handleSubmit} className={styles.formBody}>
          {stepId === "info" && (
            <EventStepInfo
              values={{
                title: values.title,
                category: values.category,
                description: values.description,
              }}
              onChange={update}
              categoryValues={categoryValues}
            />
          )}

          {stepId === "date" && (
            <EventStepDate
              values={{
                date_start: values.date_start,
                date_end: values.date_end,
                format: values.format,
                online_link: values.online_link,
                location: values.location,
                church_id: values.church_id,
                district: values.district,
              }}
              onChange={update}
              isEditing={isEditing}
              churches={churches}
              districtValues={districtValues}
            />
          )}

          {stepId === "details" && (
            <EventStepDetails
              values={{
                instructor: values.instructor,
                intervenant_category: values.intervenant_category,
                price: values.price,
                zeffy_form_path: values.zeffy_form_path,
                capacity: values.capacity,
                show_registration_count: values.show_registration_count,
                status: values.status,
                volunteer_capacity: values.volunteer_capacity,
                volunteer_auto_approve: values.volunteer_auto_approve,
                volunteer_message: values.volunteer_message,
              }}
              onChange={update}
              intervenantCategoryValues={intervenantCategoryValues}
            />
          )}

          {stepId === "messages" && (
            <EventStepMessages
              values={{
                cancel_deadline_hours: values.cancel_deadline_hours,
                confirmation_message: values.confirmation_message,
                reminder_message: values.reminder_message,
              }}
              onChange={update}
              preview={{ title: values.title, date_start: values.date_start }}
            />
          )}

          {stepId === "images" && (
            <EventStepImages
              previewUrl={imagePreview}
              hasPendingFile={imageFile !== null}
              onSelectFile={handleSelectFile}
            />
          )}

          {stepId === "review" && (
            <EventStepReview values={values} churches={churches} imagePreviewUrl={imagePreview} />
          )}

          {formError && (
            <div className={styles.errorBanner} role="alert">
              <span className={styles.errorBannerIcon} aria-hidden>⚠</span>
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
