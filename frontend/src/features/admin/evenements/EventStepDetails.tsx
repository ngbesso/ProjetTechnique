import styles from "../EvenementsPanel.module.css";
import { Field } from "../../../components/ui/Field";
import { Toggle } from "../../../components/ui/Toggle";
import { STATUS_LABELS } from "./eventLabels";
import type { EventFormValues } from "./eventDefaults";
import type { EventStatus, ParameterValue } from "../../../types";

export type DetailsFields = Pick<
  EventFormValues,
  | "instructor"
  | "intervenant_category"
  | "price"
  | "zeffy_form_path"
  | "capacity"
  | "show_registration_count"
  | "status"
  | "volunteer_capacity"
  | "volunteer_auto_approve"
  | "volunteer_message"
>;

interface EventStepDetailsProps {
  values: DetailsFields;
  onChange: (patch: Partial<DetailsFields>) => void;
  intervenantCategoryValues: ParameterValue[];
}

export function EventStepDetails({
  values,
  onChange,
  intervenantCategoryValues,
}: EventStepDetailsProps) {
  return (
    <div className={styles.grid2}>
      <Field label="Formateur / animateur">
        <input
          className={styles.input}
          placeholder="Surtout pour les formations"
          value={values.instructor}
          onChange={(e) => onChange({ instructor: e.target.value })}
        />
      </Field>

      <Field label="Catégorie d'intervenant">
        <select
          className={styles.select}
          value={values.intervenant_category ?? ""}
          onChange={(e) => onChange({ intervenant_category: e.target.value || null })}
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
          value={values.price}
          onChange={(e) => onChange({ price: e.target.value ? Number(e.target.value) : 0 })}
        />
      </Field>

      {values.price > 0 && (
        <div className={styles.fullWidth}>
          <Field label="Chemin du formulaire Zeffy *">
            <input
              className={styles.input}
              placeholder="ex. : /fr/donation-form/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={values.zeffy_form_path}
              onChange={(e) => onChange({ zeffy_form_path: e.target.value })}
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
          value={values.capacity ?? ""}
          onChange={(e) => onChange({ capacity: e.target.value ? Number(e.target.value) : null })}
        />
      </Field>

      <Field label="Nombre d'inscrits visible publiquement">
        <Toggle
          checked={values.show_registration_count}
          onChange={(v) => onChange({ show_registration_count: v })}
          label="Nombre d'inscrits visible publiquement"
        />
      </Field>

      <Field label="Statut">
        <select
          className={styles.select}
          value={values.status}
          onChange={(e) => onChange({ status: e.target.value as EventStatus })}
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
          value={values.volunteer_capacity ?? ""}
          onChange={(e) =>
            onChange({ volunteer_capacity: e.target.value ? Number(e.target.value) : null })
          }
        />
      </Field>

      <Field label="Approuver automatiquement les bénévoles">
        <Toggle
          checked={values.volunteer_auto_approve}
          onChange={(v) => onChange({ volunteer_auto_approve: v })}
          label="Approuver automatiquement les bénévoles"
        />
      </Field>

      <div className={styles.fullWidth}>
        <Field label="Message de l'annonce aux membres">
          <textarea
            className={styles.textarea}
            placeholder="Texte envoyé aux membres pour annoncer la recherche de bénévoles (optionnel)"
            value={values.volunteer_message}
            onChange={(e) => onChange({ volunteer_message: e.target.value })}
          />
        </Field>
        <p className={styles.imageHint}>
          L'annonce part automatiquement aux membres de l'église organisatrice
          à la publication d'un événement cherchant des bénévoles. Au-delà de
          la capacité, les demandes passent en liste d'attente.
        </p>
      </div>
    </div>
  );
}
