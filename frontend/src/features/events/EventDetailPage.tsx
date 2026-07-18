import { useEffect, useState } from "react";
import styles from "./EventsPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { cancelRegistration, getEvent, registerToEvent } from "../../lib/api/events";
import { ApiError } from "../../lib/api/client";
import type { EventCategory, EventItem } from "../../types";

interface EventDetailPageProps {
  eventId: number;
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  conference: "Conférence",
  colloque: "Colloque",
  croisade: "Croisade",
  retraite: "Retraite",
  formation: "Formation",
};

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

// L'API n'expose pas de "suis-je inscrit ?" — l'état local suit uniquement les
// actions faites pendant cette visite ; register est idempotent côté backend.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

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
      await registerToEvent(
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
              <span className={styles.badge}>{CATEGORY_LABELS[event.category]}</span>
              {event.price ? <span className={styles.badge}>{formatPrice(event.price)}</span> : null}
            </div>

            <h1 className={styles.detailTitle}>{event.title}</h1>
            <p className={styles.detailMeta}>
              🗓️ {formatDateTime(event.date_start)}
              {event.date_end ? ` – ${formatDateTime(event.date_end)}` : ""}
            </p>
            {event.location && (
              <p className={styles.detailMeta}>📍 {event.location}</p>
            )}
            {event.instructor && (
              <p className={styles.detailMeta}>👤 {event.instructor}</p>
            )}
            {event.district && (
              <p className={styles.detailMeta}>🗺️ District {event.district}</p>
            )}
            <p className={styles.detailMeta}>
              {event.capacity !== null
                ? (event.spots_left ?? 0) > 0
                  ? `${event.spots_left} place(s) restante(s) sur ${event.capacity}`
                  : "Événement complet"
                : "Places illimitées"}
            </p>

            {event.description && (
              <p className={styles.detailDesc}>{event.description}</p>
            )}

            {actionError && (
              <p className={styles.errorMsg} role="alert">
                {actionError}
              </p>
            )}
            {actionMsg && <p className={styles.successMsg}>{actionMsg}</p>}

            <div className={styles.detailActions}>
              {member ? (
                myStatus === "confirmed" ? (
                  <button
                    className={styles.btnCancel}
                    onClick={handleCancel}
                    disabled={submitting}
                  >
                    {submitting ? "Traitement…" : "Annuler mon inscription"}
                  </button>
                ) : (
                  <button
                    className={styles.btnRegister}
                    onClick={() => handleRegister()}
                    disabled={submitting || isFull}
                  >
                    {submitting ? "Traitement…" : "S'inscrire"}
                  </button>
                )
              ) : myStatus === "confirmed" ? null : (
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
              )}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
