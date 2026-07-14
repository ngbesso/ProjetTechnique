import { useState } from "react";
import styles from "./RegisterPage.module.css";
import { useNavigate } from "../../context/RouterContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  prenom: string;
  nom: string;
  dateNaissance: string;
  statutFamilial: string;
  courriel: string;
  motDePasse: string;
  district: string;
  eglise: string;
  statutBapteme: "baptise" | "non-baptise";
}

type Errors = Partial<Record<keyof FormData, string>>;

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUTS_FAMILIAUX = [
  "Célibataire",
  "Marié(e)",
  "Divorcé(e)",
  "Veuf / Veuve",
];

const DISTRICTS = ["Centre", "Est", "Ouest", "Nord", "Sud"];

const EGLISES_PAR_DISTRICT: Record<string, string[]> = {
  Centre: ["Église centrale", "Communauté Bethel", "Assemblée Sion"],
  Est: ["Église de l'Est", "Tabernacle Est"],
  Ouest: ["Mission Ouest", "Église Évangile Vivant"],
  Nord: ["Église du Nord", "Assemblée Grâce"],
  Sud: ["Communauté du Sud", "Église Pentecôte Sud"],
};

const INITIAL: FormData = {
  prenom: "",
  nom: "",
  dateNaissance: "",
  statutFamilial: "",
  courriel: "",
  motDePasse: "",
  district: "",
  eglise: "",
  statutBapteme: "baptise",
};

// ── Validation ────────────────────────────────────────────────────────────────

function validateStep1(data: FormData): Errors {
  const errs: Errors = {};
  if (!data.prenom.trim()) errs.prenom = "Requis";
  if (!data.nom.trim()) errs.nom = "Requis";
  if (!data.dateNaissance) errs.dateNaissance = "Requis";
  if (!data.statutFamilial) errs.statutFamilial = "Requis";
  if (!data.courriel.trim()) {
    errs.courriel = "Requis";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.courriel)) {
    errs.courriel = "Courriel invalide";
  }
  if (!data.motDePasse) {
    errs.motDePasse = "Requis";
  } else if (data.motDePasse.length < 8) {
    errs.motDePasse = "8 caractères minimum";
  }
  if (!data.district) errs.district = "Requis";
  if (!data.eglise) errs.eglise = "Requis";
  return errs;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Identité" },
    { n: 2, label: "Confirmation" },
  ] as const;

  return (
    <div className={styles.stepper}>
      {steps.map(({ n, label }, idx) => {
        const isDone = step > n;
        const isActive = step === n;
        return (
          <div key={n} style={{ display: "contents" }}>
            {idx > 0 && <div className={styles.stepConnector} />}
            <div
              className={[
                styles.stepItem,
                isDone ? styles.done : "",
                isActive ? styles.active : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={styles.stepBadge}>{isDone ? "✓" : n}</div>
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, error, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {children}
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  );
}

// ── Step 1 — Identité ─────────────────────────────────────────────────────────

interface Step1Props {
  data: FormData;
  errors: Errors;
  onChange: (field: keyof FormData, value: string) => void;
  onSubmit: () => void;
}

function Step1({ data, errors, onChange, onSubmit }: Step1Props) {
  const navigate = useNavigate();
  const eglises = data.district
    ? (EGLISES_PAR_DISTRICT[data.district] ?? [])
    : [];

  return (
    <>
      {/* IDENTITÉ */}
      <p className={styles.groupLabel}>Identité</p>
      <div className={styles.row}>
        <Field label="Prénom" error={errors.prenom}>
          <input
            className={`${styles.input} ${errors.prenom ? styles.inputError : ""}`}
            placeholder="Marie"
            value={data.prenom}
            onChange={(e) => onChange("prenom", e.target.value)}
          />
        </Field>
        <Field label="Nom" error={errors.nom}>
          <input
            className={`${styles.input} ${errors.nom ? styles.inputError : ""}`}
            placeholder="Koffi"
            value={data.nom}
            onChange={(e) => onChange("nom", e.target.value)}
          />
        </Field>
      </div>
      <div className={styles.row}>
        <Field label="Date de naissance" error={errors.dateNaissance}>
          <input
            type="date"
            className={`${styles.input} ${errors.dateNaissance ? styles.inputError : ""}`}
            value={data.dateNaissance}
            onChange={(e) => onChange("dateNaissance", e.target.value)}
          />
        </Field>
        <Field label="Statut matrimonial" error={errors.statutFamilial}>
          <select
            className={`${styles.select} ${errors.statutFamilial ? styles.inputError : ""}`}
            value={data.statutFamilial}
            onChange={(e) => onChange("statutFamilial", e.target.value)}
          >
            <option value="">Sélectionner…</option>
            {STATUTS_FAMILIAUX.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* COMPTE */}
      <p className={styles.groupLabel}>Compte</p>
      <div className={styles.row}>
        <Field label="Courriel" error={errors.courriel}>
          <input
            type="email"
            className={`${styles.input} ${errors.courriel ? styles.inputError : ""}`}
            placeholder="vous@exemple.com"
            value={data.courriel}
            onChange={(e) => onChange("courriel", e.target.value)}
          />
        </Field>
        <Field label="Mot de passe" error={errors.motDePasse}>
          <input
            type="password"
            className={`${styles.input} ${errors.motDePasse ? styles.inputError : ""}`}
            placeholder="········"
            value={data.motDePasse}
            onChange={(e) => onChange("motDePasse", e.target.value)}
          />
        </Field>
      </div>

      {/* PROFIL DE FOI */}
      <p className={styles.groupLabel}>Profil de foi</p>
      <div className={styles.row}>
        <Field label="District" error={errors.district}>
          <select
            className={`${styles.select} ${errors.district ? styles.inputError : ""}`}
            value={data.district}
            onChange={(e) => {
              onChange("district", e.target.value);
              onChange("eglise", "");
            }}
          >
            <option value="">Sélectionner…</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Église affiliée" error={errors.eglise}>
          <select
            className={`${styles.select} ${errors.eglise ? styles.inputError : ""}`}
            value={data.eglise}
            onChange={(e) => onChange("eglise", e.target.value)}
            disabled={!data.district}
          >
            <option value="">Sélectionner…</option>
            {eglises.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Statut">
        <div className={styles.radioGroup}>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="bapteme"
              value="baptise"
              checked={data.statutBapteme === "baptise"}
              onChange={() => onChange("statutBapteme", "baptise")}
            />
            Baptisé(e)
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="bapteme"
              value="non-baptise"
              checked={data.statutBapteme === "non-baptise"}
              onChange={() => onChange("statutBapteme", "non-baptise")}
            />
            Non baptisé(e)
          </label>
        </div>
      </Field>

      <div className={styles.formFooter}>
        <button
          className={styles.linkMuted}
          onClick={() => navigate("login")}
        >
          Déjà membre ? Se connecter
        </button>
        <button className={styles.btnPrimary} onClick={onSubmit}>
          Continuer &gt;
        </button>
      </div>
    </>
  );
}

// ── Step 2 — Confirmation ─────────────────────────────────────────────────────

interface Step2Props {
  data: FormData;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

function Step2({ data, onBack, onConfirm, submitting }: Step2Props) {
  const rows: { key: string; value: string }[] = [
    { key: "Prénom", value: data.prenom },
    { key: "Nom", value: data.nom },
    { key: "Date de naissance", value: data.dateNaissance },
    { key: "Statut matrimonial", value: data.statutFamilial },
    { key: "Courriel", value: data.courriel },
    { key: "District", value: data.district },
    { key: "Église affiliée", value: data.eglise },
    {
      key: "Statut baptême",
      value:
        data.statutBapteme === "baptise" ? "Baptisé(e)" : "Non baptisé(e)",
    },
  ];

  return (
    <>
      <p className={styles.groupLabel}>Vérification de vos informations</p>
      <div className={styles.confirmBox}>
        {rows.map(({ key, value }) => (
          <div key={key} className={styles.confirmRow}>
            <span className={styles.confirmKey}>{key}</span>
            <span className={styles.confirmValue}>{value}</span>
          </div>
        ))}
      </div>
      <p className={styles.confirmNotice}>
        En confirmant, votre demande d'adhésion sera transmise à
        l'administrateur qui l'approuvera. Vous recevrez un courriel de
        confirmation.
      </p>
      <div className={styles.formFooter}>
        <button className={styles.btnGhost} onClick={onBack}>
          ← Modifier
        </button>
        <button
          className={styles.btnPrimary}
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting ? "Envoi…" : "Confirmer l'inscription"}
        </button>
      </div>
    </>
  );
}

// ── Step 3 — Succès ───────────────────────────────────────────────────────────

function Step3({ prenom }: { prenom: string }) {
  return (
    <div className={styles.successBox}>
      <div className={styles.successIcon}>✅</div>
      <h2 className={styles.successTitle}>Demande envoyée, {prenom} !</h2>
      <p className={styles.successText}>
        Votre demande d'adhésion a bien été transmise.
        <br />
        L'administrateur l'examinera et vous recevrez un courriel de
        confirmation dans les prochaines heures.
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(field: keyof FormData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleStep1Submit() {
    const errs = validateStep1(data);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setStep(2);
  }

  async function handleConfirm() {
    setSubmitting(true);
    // Branchement futur : await register({ email: data.courriel, password: data.motDePasse })
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setStep(3);
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.logoIcon}>+</div>
          <h1 className={styles.cardTitle}>Devenir membre</h1>
        </div>

        {step !== 3 && <Stepper step={step} />}

        {step === 1 && (
          <Step1
            data={data}
            errors={errors}
            onChange={handleChange}
            onSubmit={handleStep1Submit}
          />
        )}
        {step === 2 && (
          <Step2
            data={data}
            onBack={() => setStep(1)}
            onConfirm={handleConfirm}
            submitting={submitting}
          />
        )}
        {step === 3 && <Step3 prenom={data.prenom} />}
      </div>
    </div>
  );
}
