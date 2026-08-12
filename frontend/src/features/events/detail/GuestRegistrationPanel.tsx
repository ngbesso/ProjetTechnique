import { useState } from "react";
import styles from "../EventsPage.module.css";
import { useResendCancelLink } from "./useResendCancelLink";
import type { GuestIdentity } from "./useEventRegistration";

interface GuestRegistrationPanelProps {
  eventId: number;
  submitting: boolean;
  /** Plus aucune place disponible : le bouton reste visible mais inactif. */
  isFull: boolean;
  onRegister: (guest: GuestIdentity) => void;
}

const EMPTY_GUEST: GuestIdentity = { first_name: "", last_name: "", email: "" };

export function GuestRegistrationPanel({
  eventId,
  submitting,
  isFull,
  onRegister,
}: GuestRegistrationPanelProps) {
  // Les coordonnées ne servent qu'ici : elles restent dans ce panneau plutôt
  // que de traverser la page.
  const [guest, setGuest] = useState<GuestIdentity>(EMPTY_GUEST);
  const resend = useResendCancelLink(eventId);

  function update(patch: Partial<GuestIdentity>) {
    setGuest((g) => ({ ...g, ...patch }));
  }

  return (
    <>
      <form
        className={styles.guestForm}
        onSubmit={(e) => {
          e.preventDefault();
          onRegister(guest);
        }}
      >
        <p className={styles.guestFormLabel}>S'inscrire sans compte :</p>
        <div className={styles.guestFormGrid}>
          <input
            className={styles.input}
            placeholder="Prénom *"
            required
            value={guest.first_name}
            onChange={(e) => update({ first_name: e.target.value })}
          />
          <input
            className={styles.input}
            placeholder="Nom *"
            required
            value={guest.last_name}
            onChange={(e) => update({ last_name: e.target.value })}
          />
          <input
            className={styles.input}
            type="email"
            placeholder="Courriel *"
            required
            value={guest.email}
            onChange={(e) => update({ email: e.target.value })}
          />
        </div>
        <button type="submit" className={styles.btnRegister} disabled={submitting || isFull}>
          {submitting ? "Traitement…" : "S'inscrire"}
        </button>
      </form>

      {resend.state === "done" ? (
        <p className={styles.successMsg}>
          Si ce courriel correspond à une inscription confirmée, un nouveau lien d'annulation
          vient de lui être envoyé.
        </p>
      ) : resend.formOpen ? (
        <form
          className={styles.guestForm}
          onSubmit={(e) => {
            e.preventDefault();
            resend.send();
          }}
        >
          <p className={styles.guestFormLabel}>Retrouver mon inscription :</p>
          <div className={styles.guestFormGrid}>
            <input
              className={styles.input}
              type="email"
              placeholder="Votre courriel *"
              required
              value={resend.email}
              onChange={(e) => resend.updateEmail(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className={styles.btnRegister}
            disabled={resend.state === "submitting"}
          >
            {resend.state === "submitting" ? "Envoi…" : "Envoyer le lien"}
          </button>
        </form>
      ) : (
        <button type="button" className={styles.btnBack} onClick={resend.openForm}>
          Vous êtes déjà inscrit et avez perdu le courriel ?
        </button>
      )}
    </>
  );
}
