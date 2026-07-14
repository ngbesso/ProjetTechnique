import { useEffect, useState } from "react";
import styles from "./EventsPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { cancelRegistration, getEvent, registerToEvent } from "../../lib/api/events";
import { ApiError } from "../../lib/api/client";
import type { EventItem } from "../../types";

interface EventDetailPageProps {
  eventId: number;
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

// L'API n'expose pas de "suis-je inscrit ?" — l'état local suit uniquement les
// actions faites pendant cette visite ; register est idempotent côté backend.
type MyStatus = "unknown" | "confirmed" | "cancelled";

export function EventDetailPage({ eventId }: EventDetailPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [myStatus, setMyStatus] = useState<MyStatus>("unknown");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMsg, setActionMsg] = useState("");

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

  async function handleRegister() {
    setSubmitting(true);
    setActionError("");
    setActionMsg("");
    try {
      await registerToEvent(eventId);
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

            <h1 className={styles.detailTitle}>{event.title}</h1>
            <p className={styles.detailMeta}>
              🗓️ {formatDateTime(event.date_start)}
              {event.date_end ? ` – ${formatDateTime(event.date_end)}` : ""}
            </p>
            {event.location && (
              <p className={styles.detailMeta}>📍 {event.location}</p>
            )}
            {event.district && (
              <p className={styles.detailMeta}>🗺️ District {event.district}</p>
            )}
            <p className={styles.detailMeta}>
              {event.max_participants !== null
                ? (event.spots_left ?? 0) > 0
                  ? `${event.spots_left} place(s) restante(s) sur ${event.max_participants}`
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
              {!user ? (
                <div className={styles.authNotice}>
                  Connectez-vous avec votre compte membre pour vous inscrire.
                  <div>
                    <button
                      className={styles.authNoticeBtn}
                      onClick={() => navigate("login")}
                    >
                      Se connecter
                    </button>
                  </div>
                </div>
              ) : myStatus === "confirmed" ? (
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
                  onClick={handleRegister}
                  disabled={
                    submitting ||
                    (event.max_participants !== null && (event.spots_left ?? 0) <= 0)
                  }
                >
                  {submitting ? "Traitement…" : "S'inscrire"}
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
