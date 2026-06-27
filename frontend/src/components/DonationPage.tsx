import { useState } from "react";
import {
  type DonationCategory,
  type DonationCurrency,
  type DonationRead,
  donationApi,
} from "../api/donationApi";
import styles from "./DonationPage.module.css";

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_AMOUNTS = [25, 50, 100, 250] as const;

const CATEGORIES: { value: DonationCategory; label: string }[] = [
  { value: "soutien_spirituel", label: "Soutien Spirituel" },
  { value: "action_communautaire", label: "Action Communautaire" },
  { value: "developpement", label: "Développement" },
];

const PAYMENT_METHODS = ["Carte", "Mobile money", "PayPal"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// ── Types ─────────────────────────────────────────────────────────────────────

type Frequency = "unique" | "mensuel";

interface FormState {
  frequency: Frequency;
  presetAmount: number | null;
  customAmount: string;
  currency: DonationCurrency;
  category: DonationCategory;
  donorName: string;
  donorEmail: string;
  paymentMethod: PaymentMethod;
}

type FieldError = Partial<
  Record<"donorName" | "donorEmail" | "customAmount" | "category", string>
>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveAmount(state: FormState): number {
  if (state.presetAmount !== null) return state.presetAmount;
  return parseFloat(state.customAmount) || 0;
}

function validate(state: FormState): FieldError {
  const errs: FieldError = {};
  const amount = resolveAmount(state);
  if (amount <= 0) errs.customAmount = "Montant invalide";
  if (!state.category) errs.category = "Requis";
  if (!state.donorName.trim()) errs.donorName = "Requis";
  if (!state.donorEmail.trim()) {
    errs.donorEmail = "Requis";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.donorEmail)) {
    errs.donorEmail = "Courriel invalide";
  }
  return errs;
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

function SuccessScreen({
  donation,
  onReset,
}: {
  donation: DonationRead;
  onReset: () => void;
}) {
  return (
    <div style={{ padding: "1.5rem" }}>
      <div className={styles.successWrap}>
        <div className={styles.successIcon}>✅</div>
        <h2 className={styles.successTitle}>Merci pour votre don !</h2>
        <p className={styles.successText}>
          Votre don de{" "}
          <strong>
            {donation.amount} {donation.currency}
          </strong>{" "}
          a bien été enregistré.
          <br />
          Un reçu fiscal vous sera envoyé par courriel.
        </p>
        <p className={styles.successText}>
          Numéro de reçu :{" "}
          <span className={styles.receiptNumber}>
            {donation.receipt_number}
          </span>
        </p>
        <button className={styles.btnBack} onClick={onReset}>
          Faire un autre don
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const INITIAL: FormState = {
  frequency: "unique",
  presetAmount: 50,
  customAmount: "",
  currency: "CAD",
  category: "soutien_spirituel",
  donorName: "",
  donorEmail: "",
  paymentMethod: "Carte",
};

export default function DonationPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FieldError>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DonationRead | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setApiError(null);
  }

  async function handleSubmit() {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setApiError(null);
    try {
      const donation = await donationApi.create({
        amount: resolveAmount(form),
        currency: form.currency,
        category: form.category,
        donor_name: form.donorName,
        donor_email: form.donorEmail,
      });
      setResult(donation);
    } catch {
      setApiError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className={styles.page}>
        <Header />
        <SuccessScreen donation={result} onReset={() => { setResult(null); setForm(INITIAL); }} />
      </div>
    );
  }

  const amount = resolveAmount(form);

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.main}>
        {/* ── Formulaire ── */}
        <div className={styles.formCard}>
          <h1 className={styles.formTitle}>Faire un don</h1>
          <p className={styles.formSubtitle}>
            Votre soutien fait avancer la mission.
          </p>

          {/* Fréquence */}
          <div className={styles.freqTabs}>
            {(["unique", "mensuel"] as const).map((f) => (
              <button
                key={f}
                className={
                  form.frequency === f
                    ? `${styles.freqTab} ${styles.freqTabActive}`
                    : styles.freqTab
                }
                onClick={() => set("frequency", f)}
              >
                {f === "unique" ? "Don unique" : "Mensuel"}
              </button>
            ))}
          </div>

          {/* Montant */}
          <p className={styles.groupLabel}>Montant</p>
          <div className={styles.amountGrid}>
            {PRESET_AMOUNTS.map((a) => (
              <button
                key={a}
                className={
                  form.presetAmount === a && form.customAmount === ""
                    ? `${styles.amountBtn} ${styles.amountBtnActive}`
                    : styles.amountBtn
                }
                onClick={() => {
                  set("presetAmount", a);
                  set("customAmount", "");
                }}
              >
                {a} $
              </button>
            ))}
          </div>
          <Field label="Autre montant" error={errors.customAmount}>
            <input
              className={`${styles.input} ${errors.customAmount ? styles.inputError : ""}`}
              type="number"
              min={1}
              placeholder="Saisir un montant…"
              value={form.customAmount}
              onChange={(e) => {
                set("customAmount", e.target.value);
                set("presetAmount", null);
              }}
            />
          </Field>

          {/* Devise */}
          <div className={styles.row}>
            <Field label="Devise">
              <select
                className={styles.select}
                value={form.currency}
                onChange={(e) =>
                  set("currency", e.target.value as DonationCurrency)
                }
              >
                <option value="CAD">CAD ($)</option>
                <option value="USD">USD ($)</option>
              </select>
            </Field>

            {/* Catégorie */}
            <Field label="Catégorie" error={errors.category}>
              <select
                className={`${styles.select} ${errors.category ? styles.inputError : ""}`}
                value={form.category}
                onChange={(e) =>
                  set("category", e.target.value as DonationCategory)
                }
              >
                {CATEGORIES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Coordonnées donateur */}
          <p className={styles.groupLabel}>
            Coordonnées (reçu et remerciement)
          </p>
          <div className={styles.row}>
            <Field label="Nom complet" error={errors.donorName}>
              <input
                className={`${styles.input} ${errors.donorName ? styles.inputError : ""}`}
                placeholder="Marie Dupont"
                value={form.donorName}
                onChange={(e) => set("donorName", e.target.value)}
              />
            </Field>
            <Field label="Courriel" error={errors.donorEmail}>
              <input
                type="email"
                className={`${styles.input} ${errors.donorEmail ? styles.inputError : ""}`}
                placeholder="vous@exemple.com"
                value={form.donorEmail}
                onChange={(e) => set("donorEmail", e.target.value)}
              />
            </Field>
          </div>

          {/* Paiement */}
          <p className={styles.groupLabel}>Paiement</p>
          <div className={styles.paymentChips}>
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                className={
                  form.paymentMethod === m
                    ? `${styles.paymentChip} ${styles.paymentChipActive}`
                    : styles.paymentChip
                }
                onClick={() => set("paymentMethod", m)}
              >
                {m}
              </button>
            ))}
          </div>

          {apiError && (
            <p className={styles.errorMsg} style={{ marginTop: "1rem" }}>
              {apiError}
            </p>
          )}
        </div>

        {/* ── Récapitulatif ── */}
        <aside className={styles.summaryCard}>
          <p className={styles.summaryTitle}>Récapitulatif</p>

          <div className={styles.summaryRow}>
            <span className={styles.summaryKey}>Don</span>
            <span>
              {amount > 0 ? `${amount.toFixed(2)} ${form.currency}` : "—"}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryKey}>Fréquence</span>
            <span>
              {form.frequency === "unique" ? "Unique" : "Mensuel"}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryKey}>Catégorie</span>
            <span>
              {CATEGORIES.find((c) => c.value === form.category)?.label ?? "—"}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryKey}>Paiement</span>
            <span>{form.paymentMethod}</span>
          </div>

          <div className={styles.summaryTotal}>
            <span>Total</span>
            <span>
              {amount > 0 ? `${amount.toFixed(2)} ${form.currency}` : "—"}
            </span>
          </div>

          <p className={styles.receiptNote}>
            Un reçu fiscal vous sera envoyé par courriel après confirmation.
          </p>

          <button
            className={styles.btnDonate}
            onClick={handleSubmit}
            disabled={submitting || amount <= 0}
          >
            {submitting
              ? "Traitement…"
              : amount > 0
              ? `Donner ${amount.toFixed(2)} ${form.currency}`
              : "Donner"}
          </button>
        </aside>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logoIcon}>+</div>
      <p className={styles.headerTitle}>Mission Évangélique</p>
    </header>
  );
}
