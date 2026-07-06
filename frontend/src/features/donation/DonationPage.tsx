import { useState, useEffect, useRef } from "react";
import styles from "./DonationPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { useChurches } from "../../hooks/useChurches";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { createPaymentIntent, confirmDonation } from "../../lib/api/donations";
import type { DonationCategory, DonationCurrency, Donation } from "../../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const AMOUNT_PRESETS = [25, 50, 100, 250];

const CATEGORIES: { value: DonationCategory; label: string }[] = [
  { value: "soutien_spirituel", label: "Soutien Spirituel" },
  { value: "action_communautaire", label: "Action Communautaire" },
  { value: "developpement", label: "Développement" },
];

const CURRENCIES: { value: DonationCurrency; label: string }[] = [
  { value: "CAD", label: "CAD ($)" },
  { value: "USD", label: "USD ($)" },
];

const PAYMENT_METHODS = ["Carte", "PayPal", "Mobile money"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// ── Stripe card element ────────────────────────────────────────────────────────

interface StripePaymentStepProps {
  amount: number;
  currency: DonationCurrency;
  category: DonationCategory;
  churchId: number;
  churchLabel: string;
  clientSecret: string;
  paymentIntentId: string;
  donorName: string;
  donorEmail?: string;
  onSuccess: (donation: Donation) => void;
  onBack: () => void;
}

// window.Stripe is loaded from https://js.stripe.com/v3/ in index.html
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Stripe?: (key: string) => any;
  }
}

function StripePaymentStep({
  amount,
  currency,
  category,
  churchId,
  churchLabel,
  clientSecret,
  paymentIntentId,
  donorName,
  donorEmail,
  onSuccess,
  onBack,
}: StripePaymentStepProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripeRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardElementRef = useRef<any>(null);
  const [cardReady, setCardReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    function init() {
      const StripeConstructor = window.Stripe;
      if (!StripeConstructor || !cardRef.current) return;

      const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
      const stripe = StripeConstructor(key);
      stripeRef.current = stripe;

      const elements = stripe.elements();
      const card = elements.create("card", {
        style: {
          base: {
            fontSize: "15px",
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            color: "#1a1a2e",
            "::placeholder": { color: "#9ca3af" },
          },
          invalid: { color: "#dc2626" },
        },
      });
      card.mount(cardRef.current);
      card.on("ready", () => { if (mounted) setCardReady(true); });
      card.on("change", (ev: { error?: { message: string } }) => {
        if (mounted) setError(ev.error?.message ?? "");
      });
      cardElementRef.current = card;
    }

    // Stripe CDN script may not be ready yet — wait for it
    if (window.Stripe) {
      init();
    } else {
      const script = document.querySelector<HTMLScriptElement>(
        'script[src="https://js.stripe.com/v3/"]'
      );
      if (script) {
        script.addEventListener("load", init, { once: true });
      }
    }

    return () => {
      mounted = false;
      cardElementRef.current?.unmount();
    };
  }, []);

  async function handlePay() {
    if (!stripeRef.current || !cardElementRef.current) return;
    setError("");
    setPaying(true);
    try {
      const result = await stripeRef.current.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElementRef.current },
      });
      if (result.error) {
        setError(result.error.message ?? "Erreur de paiement");
        return;
      }
      if (result.paymentIntent?.status !== "succeeded") {
        setError("Paiement non confirmé. Veuillez réessayer.");
        return;
      }
      const donation = await confirmDonation({
        payment_intent_id: paymentIntentId,
        category,
        church_id: churchId,
        donor_name: donorName,
        donor_email: donorEmail,
      });
      onSuccess(donation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className={styles.paymentStep}>
      {/* Summary recap */}
      <div className={styles.paymentSummary}>
        <span className={styles.paymentSummaryLabel}>Don de</span>
        <span className={styles.paymentSummaryAmount}>
          {amount.toFixed(2)} {currency}
        </span>
        <span className={styles.paymentSummaryChurch}>→ {churchLabel}</span>
      </div>

      {/* Card element */}
      <div className={styles.cardWrapper}>
        <label className={styles.label}>Informations de carte</label>
        <div className={styles.cardElement} ref={cardRef} />
        {!cardReady && (
          <p className={styles.cardLoading}>Chargement du formulaire de paiement…</p>
        )}
      </div>

      {error && (
        <p className={styles.errorMsg} role="alert">
          {error}
        </p>
      )}

      <button
        className={styles.btnDonate}
        onClick={handlePay}
        disabled={paying || !cardReady}
        style={{ marginTop: "1.25rem" }}
      >
        {paying
          ? "Traitement en cours…"
          : `Confirmer le don de ${amount.toFixed(2)} ${currency}`}
      </button>

      <button className={styles.btnBack} onClick={onBack} disabled={paying}>
        ← Modifier ma sélection
      </button>
    </div>
  );
}

// ── Success screen ─────────────────────────────────────────────────────────────

function SuccessScreen({
  donation,
  onNew,
  onBack,
}: {
  donation: Donation;
  onNew: () => void;
  onBack: () => void;
}) {
  return (
    <div className={styles.successWrap}>
      <div className={styles.successCard}>
        <div className={styles.successIcon}>✓</div>
        <h2 className={styles.successTitle}>Don confirmé !</h2>
        <p className={styles.successDesc}>
          Merci pour votre générosité. Un reçu fiscal vous sera envoyé par
          courriel.
        </p>
        <div className={styles.successMeta}>
          <div className={styles.successMetaRow}>
            <span>Numéro de reçu</span>
            <strong>{donation.receipt_number}</strong>
          </div>
          <div className={styles.successMetaRow}>
            <span>Montant</span>
            <strong>
              {donation.amount.toFixed(2)} {donation.currency}
            </strong>
          </div>
        </div>
        <div className={styles.successActions}>
          <button className={styles.btnPrimary} onClick={onNew}>
            Faire un autre don
          </button>
          <button className={styles.btnOutline} onClick={onBack}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type Step = "form" | "payment" | "success";

interface PaymentData {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: DonationCurrency;
  category: DonationCategory;
  churchId: number;
  churchLabel: string;
  donorName: string;
  donorEmail?: string;
}

export function DonationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { churches, load: loadChurches } = useChurches();

  const [step, setStep] = useState<Step>("form");
  const [frequency, setFrequency] = useState<"unique" | "mensuel">("unique");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(25);
  const [customAmount, setCustomAmount] = useState("");
  const [currency, setCurrency] = useState<DonationCurrency>("CAD");
  const [category, setCategory] = useState<DonationCategory>("action_communautaire");
  const [churchId, setChurchId] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Carte");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [success, setSuccess] = useState<Donation | null>(null);

  useEffect(() => {
    loadChurches();
  }, [loadChurches]);

  useEffect(() => {
    if (user?.email) setDonorEmail(user.email);
  }, [user]);

  const effectiveAmount = selectedPreset ?? (parseFloat(customAmount) || 0);
  const categoryLabel =
    CATEGORIES.find((c) => c.value === category)?.label ?? category;
  const churchLabel = churches.find((c) => c.id === churchId)?.name ?? "";

  function handlePreset(amount: number) {
    setSelectedPreset(amount);
    setCustomAmount("");
  }

  function handleCustomAmount(value: string) {
    setCustomAmount(value);
    setSelectedPreset(null);
  }

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (effectiveAmount <= 0) {
      setError("Veuillez saisir un montant valide.");
      return;
    }
    if (!churchId) {
      setError("Veuillez choisir une église destinataire.");
      return;
    }
    if (!donorName.trim()) {
      setError("Veuillez saisir votre nom complet.");
      return;
    }
    if (!donorEmail.trim()) {
      setError("Veuillez saisir votre adresse courriel.");
      return;
    }

    setSubmitting(true);
    try {
      const pi = await createPaymentIntent({
        amount: effectiveAmount,
        currency,
        category,
        church_id: churchId as number,
        donor_name: donorName.trim(),
        donor_email: donorEmail.trim() || undefined,
      });
      setPaymentData({
        clientSecret: pi.client_secret,
        paymentIntentId: pi.payment_intent_id,
        amount: effectiveAmount,
        currency,
        category,
        churchId: churchId as number,
        churchLabel: churchLabel || String(churchId),
        donorName: donorName.trim(),
        donorEmail: donorEmail.trim() || undefined,
      });
      setStep("payment");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handlePaymentSuccess(donation: Donation) {
    setSuccess(donation);
    setStep("success");
  }

  function resetForm() {
    setSelectedPreset(25);
    setCustomAmount("");
    setCurrency("CAD");
    setCategory("action_communautaire");
    setChurchId("");
    setPaymentMethod("Carte");
    setDonorName("");
    setDonorEmail(user?.email ?? "");
    setError("");
    setPaymentData(null);
    setSuccess(null);
    setStep("form");
  }

  return (
    <div className={styles.page}>
      <SiteHeader activePage="donation" />

      {step === "success" && success ? (
        <SuccessScreen
          donation={success}
          onNew={resetForm}
          onBack={() => navigate("home")}
        />
      ) : (
        <>
          {/* Page hero */}
          <section className={styles.hero}>
            <div className={styles.heroInner}>
              <span className={styles.heroEyebrow}>♥ Faire un don</span>
              <h1 className={styles.heroTitle}>Soutenir notre mission</h1>
              <p className={styles.heroSubtitle}>
                Chaque don, quelle qu'en soit la taille, contribue à avancer
                la mission et à renforcer notre communauté.
              </p>
            </div>
          </section>

          {/* Main content */}
          <main className={styles.main}>
            <div className={styles.layout}>
              {/* ── Form / Payment card ── */}
              <div className={styles.formCard}>
                {step === "payment" && paymentData ? (
                  <>
                    <h2 className={styles.formTitle}>Paiement sécurisé</h2>
                    <p className={styles.formSubtitle}>
                      Vos informations de carte sont traitées par Stripe — nous
                      n'y avons pas accès.
                    </p>
                    <StripePaymentStep
                      amount={paymentData.amount}
                      currency={paymentData.currency}
                      category={paymentData.category}
                      churchId={paymentData.churchId}
                      churchLabel={paymentData.churchLabel}
                      clientSecret={paymentData.clientSecret}
                      paymentIntentId={paymentData.paymentIntentId}
                      donorName={paymentData.donorName}
                      donorEmail={paymentData.donorEmail}
                      onSuccess={handlePaymentSuccess}
                      onBack={() => {
                        setStep("form");
                        setPaymentData(null);
                      }}
                    />
                  </>
                ) : (
                  <>
                    <h2 className={styles.formTitle}>Faire un don</h2>
                    <p className={styles.formSubtitle}>
                      Votre soutien fait avancer la mission.
                    </p>

                    <form onSubmit={handleContinue} noValidate>
                      {/* Frequency */}
                      <div className={styles.tabs}>
                        {(["unique", "mensuel"] as const).map((f) => (
                          <button
                            key={f}
                            type="button"
                            className={
                              frequency === f
                                ? `${styles.tab} ${styles.tabActive}`
                                : styles.tab
                            }
                            onClick={() => setFrequency(f)}
                          >
                            {f === "unique" ? "Don unique" : "Mensuel"}
                          </button>
                        ))}
                      </div>

                      {/* Preset amounts */}
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>Montant</label>
                        <div className={styles.presets}>
                          {AMOUNT_PRESETS.map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              className={
                                selectedPreset === amt
                                  ? `${styles.presetBtn} ${styles.presetBtnActive}`
                                  : styles.presetBtn
                              }
                              onClick={() => handlePreset(amt)}
                            >
                              {amt} $
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom amount */}
                      <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="customAmount">
                          Autre montant
                        </label>
                        <input
                          id="customAmount"
                          type="number"
                          min="1"
                          step="0.01"
                          className={styles.input}
                          placeholder="Saisir un montant…"
                          value={customAmount}
                          onChange={(e) => handleCustomAmount(e.target.value)}
                        />
                      </div>

                      {/* Currency + Category */}
                      <div className={styles.row}>
                        <div className={styles.fieldGroup}>
                          <label className={styles.label} htmlFor="currency">
                            Devise
                          </label>
                          <select
                            id="currency"
                            className={styles.select}
                            value={currency}
                            onChange={(e) =>
                              setCurrency(e.target.value as DonationCurrency)
                            }
                          >
                            {CURRENCIES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={styles.fieldGroup}>
                          <label className={styles.label} htmlFor="category">
                            Catégorie
                          </label>
                          <select
                            id="category"
                            className={styles.select}
                            value={category}
                            onChange={(e) =>
                              setCategory(e.target.value as DonationCategory)
                            }
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Church */}
                      <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="church">
                          Église destinataire
                        </label>
                        <select
                          id="church"
                          className={styles.select}
                          value={churchId}
                          onChange={(e) =>
                            setChurchId(
                              e.target.value ? parseInt(e.target.value) : ""
                            )
                          }
                          required
                        >
                          <option value="">— Choisir une église —</option>
                          {churches.map((ch) => (
                            <option key={ch.id} value={ch.id}>
                              {ch.name}
                              {ch.district ? ` · ${ch.district}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Donor info */}
                      <div className={styles.row}>
                        <div className={styles.fieldGroup}>
                          <label className={styles.label} htmlFor="donorName">
                            Nom complet
                          </label>
                          <input
                            id="donorName"
                            type="text"
                            className={styles.input}
                            placeholder="Jean Dupont"
                            value={donorName}
                            onChange={(e) => setDonorName(e.target.value)}
                            required
                          />
                        </div>
                        <div className={styles.fieldGroup}>
                          <label className={styles.label} htmlFor="donorEmail">
                            Courriel
                          </label>
                          <input
                            id="donorEmail"
                            type="email"
                            className={styles.input}
                            placeholder="jean@exemple.com"
                            value={donorEmail}
                            onChange={(e) => setDonorEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* Payment method */}
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>Mode de paiement</label>
                        <div className={styles.paymentChips}>
                          {PAYMENT_METHODS.map((method) => (
                            <button
                              key={method}
                              type="button"
                              className={
                                paymentMethod === method
                                  ? `${styles.chip} ${styles.chipActive}`
                                  : styles.chip
                              }
                              onClick={() => setPaymentMethod(method)}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                      </div>

                      {error && (
                        <p className={styles.errorMsg} role="alert">
                          {error}
                        </p>
                      )}
                    </form>
                  </>
                )}
              </div>

              {/* ── Summary card ── */}
              <aside className={styles.summaryCard}>
                <h2 className={styles.summaryTitle}>Récapitulatif</h2>

                <div className={styles.summaryRows}>
                  <div className={styles.summaryRow}>
                    <span>Don</span>
                    <span>
                      {effectiveAmount > 0
                        ? `${effectiveAmount.toFixed(2)} ${currency}`
                        : "—"}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Fréquence</span>
                    <span>{frequency === "unique" ? "Unique" : "Mensuel"}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Catégorie</span>
                    <span>{categoryLabel}</span>
                  </div>
                  {churchLabel && (
                    <div className={styles.summaryRow}>
                      <span>Église</span>
                      <span className={styles.summaryValue}>{churchLabel}</span>
                    </div>
                  )}
                  <div className={styles.summaryRow}>
                    <span>Paiement</span>
                    <span>{paymentMethod}</span>
                  </div>
                  {donorName && (
                    <div className={styles.summaryRow}>
                      <span>Nom</span>
                      <span className={styles.summaryValue}>{donorName}</span>
                    </div>
                  )}
                  {donorEmail && (
                    <div className={styles.summaryRow}>
                      <span>Courriel</span>
                      <span className={styles.summaryValue}>{donorEmail}</span>
                    </div>
                  )}
                </div>

                <div className={styles.summaryTotal}>
                  <span>Total</span>
                  <span>
                    {effectiveAmount > 0
                      ? `${effectiveAmount.toFixed(2)} ${currency}`
                      : `0.00 ${currency}`}
                  </span>
                </div>

                <p className={styles.summaryInfo}>
                  Un reçu fiscal vous sera envoyé par courriel après
                  confirmation.
                </p>

                {step === "form" && (
                  <button
                    className={styles.btnDonate}
                    onClick={handleContinue}
                    disabled={submitting || effectiveAmount <= 0 || !churchId}
                  >
                    {submitting
                      ? "Traitement…"
                      : effectiveAmount > 0
                      ? `Continuer — ${effectiveAmount.toFixed(2)} ${currency}`
                      : "Continuer"}
                  </button>
                )}

                <div className={styles.summaryBadges}>
                  <span className={styles.badge}>🔒 Stripe sécurisé</span>
                  <span className={styles.badge}>📄 Reçu fiscal</span>
                </div>
              </aside>
            </div>
          </main>
        </>
      )}

      <SiteFooter />
    </div>
  );
}
