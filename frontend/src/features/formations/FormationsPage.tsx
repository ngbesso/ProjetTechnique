import { useEffect, useState } from "react";
import styles from "./FormationsPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { useAuth } from "../../context/AuthContext";
import { useFormations } from "../../hooks/useFormations";
import { registerToFormation } from "../../lib/api/formations";
import type { Formation, FormationRegistrationInput } from "../../types";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPrice(price: number): string {
  return price === 0 ? "Gratuit" : `${price.toFixed(2)} $`;
}

const EMPTY_REGISTRATION: FormationRegistrationInput = {
  first_name: "",
  last_name: "",
  email: "",
};

export function FormationsPage() {
  const { member } = useAuth();
  const { formations, loading, error, load } = useFormations();

  const [registering, setRegistering] = useState<Formation | null>(null);
  const [regForm, setRegForm] = useState<FormationRegistrationInput>(EMPTY_REGISTRATION);
  const [regSaving, setRegSaving] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);

  useEffect(() => {
    load({ limit: 100 });
  }, [load]);

  function openRegistration(f: Formation) {
    if (f.capacity - f.registered_count <= 0) return;
    setRegistering(f);
    setRegForm(
      member
        ? { first_name: member.first_name, last_name: member.last_name, email: member.email }
        : EMPTY_REGISTRATION,
    );
    setRegError("");
    setRegSuccess(false);
  }

  function closeRegistration() {
    setRegistering(null);
    setRegForm(EMPTY_REGISTRATION);
    setRegError("");
    setRegSuccess(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!registering) return;
    if (!regForm.first_name.trim() || !regForm.last_name.trim() || !regForm.email.trim()) {
      setRegError("Tous les champs sont requis.");
      return;
    }
    setRegSaving(true);
    setRegError("");
    try {
      await registerToFormation(registering.id, {
        first_name: regForm.first_name.trim(),
        last_name: regForm.last_name.trim(),
        email: regForm.email.trim(),
      });
      setRegSuccess(true);
      load({ limit: 100 });
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setRegSaving(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const upcoming = formations
    .filter((f) => f.formation_date >= today)
    .sort((a, b) => a.formation_date.localeCompare(b.formation_date));
  const past = formations
    .filter((f) => f.formation_date < today)
    .sort((a, b) => b.formation_date.localeCompare(a.formation_date));

  return (
    <div className={styles.page}>
      <SiteHeader activePage="formations" />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>Grandir</span>
          <h1 className={styles.heroTitle}>Formations</h1>
          <p className={styles.heroSubtitle}>
            Des parcours bibliques et pratiques pour grandir dans la foi et le service.
          </p>
        </div>
      </section>

      <main className={styles.main}>
        {error && (
          <p className={styles.errorMsg} role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className={styles.stateMsg}>Chargement…</p>
        ) : formations.length === 0 ? (
          <p className={styles.stateMsg}>Aucune formation programmée pour le moment.</p>
        ) : (
          <>
            <section className={styles.group}>
              <h2 className={styles.groupTitle}>À venir</h2>
              {upcoming.length === 0 ? (
                <p className={styles.stateMsg}>Aucune formation à venir.</p>
              ) : (
                <div className={styles.grid}>
                  {upcoming.map((f) => {
                    const placesLeft = f.capacity - f.registered_count;
                    const isFull = placesLeft <= 0;
                    return (
                      <article key={f.id} className={styles.card}>
                        <div className={styles.cardTop}>
                          <span className={styles.price}>{formatPrice(f.price)}</span>
                          <span className={isFull ? styles.placesFull : styles.places}>
                            {isFull
                              ? "Complet"
                              : `${placesLeft} place${placesLeft > 1 ? "s" : ""} restante${placesLeft > 1 ? "s" : ""}`}
                          </span>
                        </div>
                        <p className={styles.cardTitle}>{f.title}</p>
                        <p className={styles.cardMeta}>👤 {f.instructor}</p>
                        <p className={styles.cardMeta}>📅 {formatDate(f.formation_date)}</p>
                        {f.description && <p className={styles.cardDesc}>{f.description}</p>}
                        <button
                          className={styles.btnPrimary}
                          disabled={isFull}
                          onClick={() => openRegistration(f)}
                        >
                          {isFull ? "Complet" : "S'inscrire"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {past.length > 0 && (
              <section className={styles.group}>
                <h2 className={styles.groupTitle}>Passées</h2>
                <div className={styles.grid}>
                  {past.map((f) => (
                    <article key={f.id} className={`${styles.card} ${styles.cardPast}`}>
                      <div className={styles.cardTop}>
                        <span className={styles.price}>{formatPrice(f.price)}</span>
                        <span className={styles.pastTag}>Terminée</span>
                      </div>
                      <p className={styles.cardTitle}>{f.title}</p>
                      <p className={styles.cardMeta}>👤 {f.instructor}</p>
                      <p className={styles.cardMeta}>📅 {formatDate(f.formation_date)}</p>
                      {f.description && <p className={styles.cardDesc}>{f.description}</p>}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <SiteFooter />

      {registering && (
        <div className={styles.modalOverlay} onClick={closeRegistration}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalTitle}>{registering.title}</p>
                <p className={styles.modalSub}>
                  {registering.instructor} · {formatDate(registering.formation_date)} ·{" "}
                  {formatPrice(registering.price)}
                </p>
              </div>
              <button className={styles.modalClose} onClick={closeRegistration} aria-label="Fermer">
                ✕
              </button>
            </div>

            {regSuccess ? (
              <div className={styles.modalBody}>
                <p className={styles.successMsg}>
                  ✓ Inscription confirmée ! Nous vous attendons le{" "}
                  {formatDate(registering.formation_date)}.
                </p>
                <div className={styles.modalActions}>
                  <button className={styles.btnPrimary} onClick={closeRegistration}>
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <form className={styles.modalBody} onSubmit={handleRegister}>
                <div className={styles.formGrid}>
                  <input
                    className={styles.input}
                    placeholder="Prénom *"
                    required
                    value={regForm.first_name}
                    onChange={(e) => setRegForm({ ...regForm, first_name: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    placeholder="Nom *"
                    required
                    value={regForm.last_name}
                    onChange={(e) => setRegForm({ ...regForm, last_name: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    type="email"
                    placeholder="Courriel *"
                    required
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  />
                </div>
                {regError && (
                  <p className={styles.errorMsg} role="alert">
                    ⚠ {regError}
                  </p>
                )}
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={closeRegistration}
                    disabled={regSaving}
                  >
                    Annuler
                  </button>
                  <button type="submit" className={styles.btnPrimary} disabled={regSaving}>
                    {regSaving ? "Inscription…" : "Confirmer mon inscription"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
