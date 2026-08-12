// Annulation par un inscrit sans compte, depuis le lien reçu par courriel.
// Raison de changer : ce parcours d'annulation hors session.
import { useState } from "react";
import { cancelRegistrationByToken } from "../../../lib/api/events";
import { ApiError } from "../../../lib/api/client";

type CancelState = "idle" | "submitting" | "done" | "error";

export function useGuestCancellation() {
  // Présent uniquement quand la page est ouverte depuis le lien d'annulation
  // envoyé par courriel à un inscrit sans compte.
  const [token] = useState(() => new URLSearchParams(window.location.search).get("cancel_token"));
  const [state, setState] = useState<CancelState>("idle");
  const [error, setError] = useState("");

  async function cancelByToken() {
    if (!token) return;
    setState("submitting");
    setError("");
    try {
      await cancelRegistrationByToken(token);
      setState("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'annuler l'inscription.");
      setState("error");
    }
  }

  return { token, state, error, cancelByToken };
}
