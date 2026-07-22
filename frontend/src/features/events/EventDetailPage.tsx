import { useEffect, useState } from "react";
import styles from "./EventsPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import {
  cancelRegistration,
  cancelRegistrationByToken,
  fetchMyEventRegistrations,
  getEvent,
  registerToEvent,
  resendCancelLink,
} from "../../lib/api/events";
import { ApiError } from "../../lib/api/client";
import type { EventItem } from "../../types";

interface EventDetailPageProps {
  eventId: number;
}

const DEFAULT_CANCEL_DEADLINE_HOURS = 24;

interface CancelDeadlineInfo {
  passed: boolean;
  label: string;
}

function cancelDeadlineInfo(dateStart: string, deadlineHours: number): CancelDeadlineInfo {
  const deadline = new Date(dateStart).getTime() - deadlineHours * 3_600_000;
  const now = Date.now();
  if (now >= deadline) {
    return {
      passed: true,
      label: `Le délai pour annuler votre inscription est dépassé (annulation possible jusqu'à ${deadlineHours} h avant l'événement).`,
    };
  }
  const hoursRemaining = Math.max(Math.floor((deadline - now) / 3_600_000), 1);
  const remaining =
    hoursRemaining >= 48
      ? `${Math.floor(hoursRemaining / 24)} jours`
      : hoursRemaining >= 24
      ? "1 jour"
      : `${hoursRemaining} h`;
  return {
    passed: false,
    label: `Vous pouvez encore annuler votre inscription (encore ${remaining}, jusqu'à ${deadlineHours} h avant l'événement).`,
  };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price: number | null): string {
  if (!price) return "Gratuit";
  return `${price.toFixed(2)} $`;
}

// Pour un membre connecté, initialisé au chargement via /registrations/me.
// Pour un invité, l'API n'expose pas de "suis-je inscrit ?" — l'état local
// suit alors uniquement les actions faites pendant cette visite ; register
// reste idempotent côté backend.
type MyStatus = "unknown" | "confirmed" | "cancelled";

const EMPTY_GUEST = { first_name: "", last_name: "", email: "" };

export function EventDetailPage({ eventId }: EventDetailPageProps) {
  const { member } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [myStatus, setMyStatus] = useState<MyStatus>("unknown");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [guestForm, setGuestForm] = useState(EMPTY_GUEST);
  const [registeredOnlineLink, setRegisteredOnlineLink] = useState<string | null>(null);

  // « Retrouver mon inscription » — invité ayant perdu son courriel de confirmation.
  const [showResendForm, setShowResendForm] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendState, setResendState] = useState<"idle" | "submitting" | "done">("idle");

  // Présent uniquement quand la page est ouverte depuis le lien d'annulation
  // envoyé par courriel à un inscrit sans compte.
  const [cancelToken] = useState(() => new URLSearchParams(window.location.search).get("cancel_token"));
  const [tokenCancelState, setTokenCancelState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [tokenCancelError, setTokenCancelError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    getEvent(eventId)
      .then(setEvent)
      .catch((err) => setError(err instanceof Error ? err.message : "Événement introuvable."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    if (member) {
      fetchMyEventRegistrations()
        .then((regs) => {
          setMyStatus(regs.some((r) => r.event_id === eventId) ? "confirmed" : "unknown");
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, member]);

  async function handleCancelByToken() {
    if (!cancelToken) return;
    setTokenCancelState("submitting");
    setTokenCancelError("");
    try {
      await cancelRegistrationByToken(cancelToken);
      setTokenCancelState("done");
    } catch (err) {
      setTokenCancelError(
        err instanceof ApiError ? err.message : "Impossible d'annuler l'inscription."
      );
      setTokenCancelState("error");
    }
  }

  async function handleResendCancelLink(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendState("submitting");
    try {
      await resendCancelLink(eventId, resendEmail.trim());
    } catch {
      // Réponse volontairement identique côté serveur : on ne distingue pas
      // une inscription trouvée d'une inscription introuvable.
    } finally {
      setResendState("done");
    }
  }

  async function handleRegister(e?: React.FormEvent) {
    e?.preventDefault();
    if (!member) {
      if (!guestForm.first_name.trim() || !guestForm.last_name.trim() || !guestForm.email.trim()) {
        setActionError("Prénom, nom et courriel sont requis pour s'inscrire.");
        return;
      }
    }
    setSubmitting(true);
    setActionError("");
    setActionMsg("");
    try {
      const registration = await registerToEvent(
        eventId,
        member
          ? undefined
          : {
              first_name: guestForm.first_name.trim(),
              last_name: guestForm.last_name.trim(),
              email: guestForm.email.trim(),
            },
      );
      setMyStatus("confirmed");
      setActionMsg("Vous êtes inscrit à cet événement.");
      setRegisteredOnlineLink(registration.online_link);
      load();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Impossible de s'inscrire pour le moment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    setSubmitting(true);
    setActionError("");
    setActionMsg("");
    try {
      await cancelRegistration(eventId);
      setMyStatus("cancelled");
      setActionMsg("Votre inscription a été annulée.");
      load();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Impossible d'annuler l'inscription."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isFull = event ? event.capacity !== null && (event.spots_left ?? 0) <= 0 : false;
  const deadline = event
    ? cancelDeadlineInfo(event.date_start, event.cancel_deadline_hours ?? DEFAULT_CANCEL_DEADLINE_HOURS)
    : null;

  const needsZeffyPayment = !!event && !!event.price && event.price > 0;
  const zeffyBlock = event?.zeffy_form_path ? (
    <div className={styles.zeffyWrapper}>
      <iframe
        title="Formulaire de paiement Zeffy"
        src={`https://www.zeffy.com${event.zeffy_form_path}`}
        className={styles.zeffyEmbed}
        allowFullScreen
      />
    </div>
  ) : (
    <div className={styles.notConfigured}>
      <p>Le paiement pour cet événement n'est pas encore configuré.</p>
    </div>
  );

  return (
    <div className={styles.page}>
      <SiteHeader activePage="evenements" />

      <main className={styles.main}>
        {loading ? (
          <p className={styles.stateMsg}>Chargement…</p>
        ) : error || !event ? (
          <p className={styles.errorMsg} role="alert">
            {error || "Événement introuvable."}
          </p>
        ) : (
          <div className={styles.detailCard}>
            <button className={styles.btnBack} onClick={() => navigate("evenements")}>
              ← Retour aux événements
            </button>

            <div className={styles.cardBadges}>
              <span className={styles.badge}>{event.category}</span>
              {event.format === "en_ligne" && <span className={styles.badge}>🌐 En ligne</span>}
              {event.format === "hybride" && <span className={styles.badge}>🌐 Hybride</span>}
              {event.price ? <span className={styles.badge}>{formatPrice(event.price)}</span> : null}
            </div>

            <h1 className={styles.detailTitle}>{event.title}</h1>
            <p className={styles.detailMeta}>
              🗓️ {formatDateTime(event.date_start)}
              {event.date_end ? ` – ${formatDateTime(event.date_end)}` : ""}
            </p>
            {event.format !== "en_ligne" && event.location && (
              <p className={styles.detailMeta}>📍 {event.location}</p>
            )}
            {event.format !== "presentiel" && (
              <p className={styles.detailMeta}>
                🌐 {event.format === "hybride" ? "Aussi disponible en ligne" : "Cet événement se déroule en ligne"}{" "}
                — le lien de connexion vous sera communiqué après votre inscription.
              </p>
            )}
            {event.instructor && (
              <p className={styles.detailMeta}>👤 {event.instructor}</p>
            )}
            {event.district && (
              <p className={styles.detailMeta}>🗺️ District {event.district}</p>
            )}
            {event.show_registration_count && (
              <p className={styles.detailMeta}>
                {event.capacity !== null
                  ? (event.spots_left ?? 0) > 0
                    ? `${event.spots_left} place(s) restante(s) sur ${event.capacity}`
                    : "Événement complet"
                  : "Places illimitées"}
              </p>
            )}

            {event.description && (
              <p className={styles.detailDesc}>{event.description}</p>
            )}

            {actionError && (
              <p className={styles.errorMsg} role="alert">
                {actionError}
              </p>
            )}
            {actionMsg && <p className={styles.successMsg}>{actionMsg}</p>}
            {registeredOnlineLink && (
              <p className={styles.successMsg}>
                Lien de connexion :{" "}
                <a href={registeredOnlineLink} target="_blank" rel="noreferrer">
                  {registeredOnlineLink}
                </a>
              </p>
            )}

            <div className={styles.detailActions}>
              {cancelToken ? (
                tokenCancelState === "done" ? (
                  <p className={styles.successMsg}>Votre inscription a été annulée.</p>
                ) : (
                  <>
                    {deadline && (
                      <p className={deadline.passed ? styles.errorMsg : styles.detailMeta}>
                        {deadline.label}
                      </p>
                    )}
                    {!deadline?.passed && (
                      <button
                        className={styles.btnCancel}
                        onClick={handleCancelByToken}
                        disabled={tokenCancelState === "submitting"}
                      >
                        {tokenCancelState === "submitting"
                          ? "Traitement…"
                          : "Confirmer l'annulation de mon inscription"}
                      </button>
                    )}
                    {tokenCancelError && (
                      <p className={styles.errorMsg} role="alert">
                        {tokenCancelError}
                      </p>
                    )}
                  </>
                )
              ) : member ? (
                myStatus === "confirmed" ? (
                  <>
                    {deadline && (
                      <p className={deadline.passed ? styles.errorMsg : styles.detailMeta}>
                        {deadline.label}
                      </p>
                    )}
                    {!deadline?.passed && (
                      <button
                        className={styles.btnCancel}
                        onClick={handleCancel}
                        disabled={submitting}
                      >
                        {submitting ? "Traitement…" : "Annuler mon inscription"}
                      </button>
                    )}
                  </>
                ) : needsZeffyPayment ? (
                  zeffyBlock
                ) : (
                  <button
                    className={styles.btnRegister}
                    onClick={() => handleRegister()}
                    disabled={submitting || isFull}
                  >
                    {submitting ? "Traitement…" : "S'inscrire"}
                  </button>
                )
              ) : myStatus === "confirmed" ? null : needsZeffyPayment ? (
                zeffyBlock
              ) : (
                <>
                  <form className={styles.guestForm} onSubmit={handleRegister}>
                    <p className={styles.guestFormLabel}>S'inscrire sans compte :</p>
                    <div className={styles.guestFormGrid}>
                      <input
                        className={styles.input}
                        placeholder="Prénom *"
                        required
                        value={guestForm.first_name}
                        onChange={(e) => setGuestForm({ ...guestForm, first_name: e.target.value })}
                      />
                      <input
                        className={styles.input}
                        placeholder="Nom *"
                        required
                        value={guestForm.last_name}
                        onChange={(e) => setGuestForm({ ...guestForm, last_name: e.target.value })}
                      />
                      <input
                        className={styles.input}
                        type="email"
                        placeholder="Courriel *"
                        required
                        value={guestForm.email}
                        onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                      />
                    </div>
                    <button
                      type="submit"
                      className={styles.btnRegister}
                      disabled={submitting || isFull}
                    >
                      {submitting ? "Traitement…" : "S'inscrire"}
                    </button>
                  </form>

                  {resendState === "done" ? (
                    <p className={styles.successMsg}>
                      Si ce courriel correspond à une inscription confirmée, un nouveau
                      lien d'annulation vient de lui être envoyé.
                    </p>
                  ) : showResendForm ? (
                    <form className={styles.guestForm} onSubmit={handleResendCancelLink}>
                      <p className={styles.guestFormLabel}>Retrouver mon inscription :</p>
                      <div className={styles.guestFormGrid}>
                        <input
                          className={styles.input}
                          type="email"
                          placeholder="Votre courriel *"
                          required
                          value={resendEmail}
                          onChange={(e) => setResendEmail(e.target.value)}
                        />
                      </div>
                      <button
                        type="submit"
                        className={styles.btnRegister}
                        disabled={resendState === "submitting"}
                      >
                        {resendState === "submitting" ? "Envoi…" : "Envoyer le lien"}
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className={styles.btnBack}
                      onClick={() => setShowResendForm(true)}
                    >
                      Vous êtes déjà inscrit et avez perdu le courriel ?
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
