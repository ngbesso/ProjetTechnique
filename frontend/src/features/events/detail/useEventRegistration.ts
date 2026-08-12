// Inscription d'une personne à un événement. Raison de changer : le parcours
// d'inscription lui-même (qui peut s'inscrire, ce qu'on lui demande).
import { useEffect, useState } from "react";
import {
  cancelRegistration,
  fetchMyEventRegistrations,
  registerToEvent,
} from "../../../lib/api/events";
import { ApiError } from "../../../lib/api/client";

// Pour un membre connecté, initialisé au chargement via /registrations/me.
// Pour un invité, l'API n'expose pas de « suis-je inscrit ? » — l'état local
// suit alors uniquement les actions faites pendant cette visite ; register
// reste idempotent côté backend.
export type RegistrationStatus = "unknown" | "confirmed" | "cancelled";

/** Coordonnées d'un inscrit sans compte, saisies par le panneau invité. */
export interface GuestIdentity {
  first_name: string;
  last_name: string;
  email: string;
}

interface UseEventRegistrationOptions {
  eventId: number;
  /** Un membre connecté s'inscrit sans saisir ses coordonnées. */
  isMember: boolean;
  /** Appelé après une inscription ou une annulation, pour rafraîchir les places. */
  onRegistrationChanged: () => void;
}

function isComplete(guest: GuestIdentity | undefined): guest is GuestIdentity {
  return !!guest && !!guest.first_name.trim() && !!guest.last_name.trim() && !!guest.email.trim();
}

function trimmed(guest: GuestIdentity): GuestIdentity {
  return {
    first_name: guest.first_name.trim(),
    last_name: guest.last_name.trim(),
    email: guest.email.trim(),
  };
}

export function useEventRegistration({
  eventId,
  isMember,
  onRegistrationChanged,
}: UseEventRegistrationOptions) {
  const [status, setStatus] = useState<RegistrationStatus>("unknown");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [onlineLink, setOnlineLink] = useState<string | null>(null);

  useEffect(() => {
    if (!isMember) return;
    fetchMyEventRegistrations()
      .then((regs) => {
        const match = regs.find((r) => r.event_id === eventId);
        setStatus(match ? "confirmed" : "unknown");
        setOnlineLink(match?.event.online_link ?? null);
      })
      .catch(() => {});
  }, [eventId, isMember]);

  /** `guest` n'est attendu que d'un visiteur sans compte. */
  async function register(guest?: GuestIdentity) {
    if (!isMember && !isComplete(guest)) {
      setError("Prénom, nom et courriel sont requis pour s'inscrire.");
      return;
    }
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const registration = await registerToEvent(
        eventId,
        isMember || !guest ? undefined : trimmed(guest),
      );
      setStatus("confirmed");
      setMessage("Vous êtes inscrit à cet événement.");
      setOnlineLink(registration.online_link);
      onRegistrationChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de s'inscrire pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel() {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await cancelRegistration(eventId);
      setStatus("cancelled");
      setMessage("Votre inscription a été annulée.");
      onRegistrationChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'annuler l'inscription.");
    } finally {
      setSubmitting(false);
    }
  }

  return { status, submitting, error, message, onlineLink, register, cancel };
}
