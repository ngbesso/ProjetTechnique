import { useState, useEffect } from "react";
import styles from "./DonationPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { useDonations } from "../../hooks/useDonations";
import { useChurches } from "../../hooks/useChurches";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
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

const PAYMENT_METHODS = ["Carte", "Mobile money", "PayPal"] as const;

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

export function DonationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { submit } = useDonations();
  const { churches, load: loadChurches } = useChurches();

  const [frequency, setFrequency] = useState<"unique" | "mensuel">("unique");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(25);
  const [customAmount, setCustomAmount] = useState("");
  const [currency, setCurrency] = useState<DonationCurrency>("CAD");
  const [category, setCategory] = useState<DonationCategory>("action_communautaire");
  const [churchId, setChurchId] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState("Carte");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Donation | null>(null);

  useEffect(() => {
    loadChurches();
  }, [loadChurches]);

  const effectiveAmount = selectedPreset ?? (parseFloat(customAmount) || 0);
  const categoryLabel =
    CATEGORIES.find((c) => c.value === category)?.label ?? category;
  const churchLabel = churches.find((c) => c.id === churchId)?.name ?? null;

  function handlePreset(amount: number) {
    setSelectedPreset(amount);
    setCustomAmount("");
  }

  function handleCustomAmount(value: string) {
    setCustomAmount(value);
    setSelectedPreset(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!user) {
      navigate("login");
      return;
    }
    if (effectiveAmount <= 0) {
      setError("Veuillez saisir un montant valide.");
      return;
    }
    if (!churchId) {
      setError("Veuillez choisir une église destinataire.");
      return;
    }

    setSubmitting(true);
    try {
      const donation = await submit({
        amount: effectiveAmount,
        currency,
        category,
        church_id: churchId as number,
      });
      setSuccess(donation);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue. Veuillez réessayer."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSelectedPreset(25);
    setCustomAmount("");
    setCurrency("CAD");
    setCategory("action_communautaire");
    setChurchId("");
    setPaymentMethod("Carte");
    setError("");
    setSuccess(null);
  }

  return (
    <div className={styles.page}>
      <SiteHeader activePage="donation" />

      {success ? (
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
              {/* ── Form card ── */}
              <div className={styles.formCard}>
                <h2 className={styles.formTitle}>Faire un don</h2>
                <p className={styles.formSubtitle}>
                  Votre soutien fait avancer la mission.
                </p>

                <form onSubmit={handleSubmit} noValidate>
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

                  {/* Payment method */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Paiement</label>
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
                  <div className={styles.summaryRow}>
                    <span>Paiement</span>
                    <span>{paymentMethod}</span>
                  </div>
                  {churchLabel && (
                    <div className={styles.summaryRow}>
                      <span>Église</span>
                      <span className={styles.summaryValue}>{churchLabel}</span>
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

                <button
                  className={styles.btnDonate}
                  onClick={handleSubmit}
                  disabled={submitting || effectiveAmount <= 0 || !churchId}
                >
                  {submitting
                    ? "Traitement…"
                    : effectiveAmount > 0
                    ? `Donner ${effectiveAmount.toFixed(2)} ${currency}`
                    : "Donner"}
                </button>

                <div className={styles.summaryBadges}>
                  <span className={styles.badge}>🔒 Paiement sécurisé</span>
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
