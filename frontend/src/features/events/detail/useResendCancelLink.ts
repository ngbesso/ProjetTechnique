// « Retrouver mon inscription » — invité ayant perdu son courriel de
// confirmation. Raison de changer : ce parcours de renvoi de lien.
//
// L'état reste ici plutôt que dans la page : seul le formulaire invité s'en
// sert, rien ne traverse donc la hiérarchie.
import { useState } from "react";
import { resendCancelLink } from "../../../lib/api/events";

type ResendState = "idle" | "submitting" | "done";

export function useResendCancelLink(eventId: number) {
  const [formOpen, setFormOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<ResendState>("idle");

  function openForm() {
    setFormOpen(true);
  }

  function updateEmail(value: string) {
    setEmail(value);
  }

  async function send() {
    if (!email.trim()) return;
    setState("submitting");
    try {
      await resendCancelLink(eventId, email.trim());
    } catch {
      // Réponse volontairement identique côté serveur : on ne distingue pas
      // une inscription trouvée d'une inscription introuvable.
    } finally {
      setState("done");
    }
  }

  return { formOpen, email, state, openForm, updateEmail, send };
}
