import { useCallback, useEffect, useState } from "react";
import styles from "./EventsPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { getEvent } from "../../lib/api/events";
import { eventActionContext } from "./detail/eventActionContext";
import { EventDetailHeader } from "./detail/EventDetailHeader";
import { EventPracticalInfo } from "./detail/EventPracticalInfo";
import { EventCancelByTokenPanel } from "./detail/EventCancelByTokenPanel";
import { GuestRegistrationPanel } from "./detail/GuestRegistrationPanel";
import { MemberRegistrationPanel } from "./detail/MemberRegistrationPanel";
import { RegistrationFeedback } from "./detail/RegistrationFeedback";
import { ZeffyPaymentBlock } from "./detail/ZeffyPaymentBlock";
import { useEventRegistration } from "./detail/useEventRegistration";
import { useGuestCancellation } from "./detail/useGuestCancellation";
import type { EventItem } from "../../types";

interface EventDetailPageProps {
  eventId: number;
}

export function EventDetailPage({ eventId }: EventDetailPageProps) {
  const { member } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    getEvent(eventId)
      .then(setEvent)
      .catch((err) => setError(err instanceof Error ? err.message : "Événement introuvable."))
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const registration = useEventRegistration({
    eventId,
    isMember: !!member,
    onRegistrationChanged: load,
  });
  const cancellation = useGuestCancellation();

  const actions = event
    ? eventActionContext(event, registration.status === "confirmed")
    : null;

  return (
    <div className={styles.page}>
      <SiteHeader activePage="evenements" />

      <main className={styles.main}>
        {loading ? (
          <p className={styles.stateMsg}>Chargement…</p>
        ) : error || !event || !actions ? (
          <p className={styles.errorMsg} role="alert">
            {error || "Événement introuvable."}
          </p>
        ) : (
          <div className={styles.detailCard}>
            <button className={styles.btnBack} onClick={() => navigate("evenements")}>
              ← Retour aux événements
            </button>

            <EventDetailHeader
              category={event.category}
              format={event.format}
              price={event.price}
              title={event.title}
            />
            <EventPracticalInfo
              date_start={event.date_start}
              date_end={event.date_end}
              format={event.format}
              location={event.location}
              instructor={event.instructor}
              district={event.district}
              show_registration_count={event.show_registration_count}
              capacity={event.capacity}
              spots_left={event.spots_left}
            />

            {event.description && <p className={styles.detailDesc}>{event.description}</p>}

            <RegistrationFeedback
              error={registration.error}
              message={registration.message}
              onlineLink={registration.onlineLink}
            />

            <div className={styles.detailActions}>
              {cancellation.token ? (
                <EventCancelByTokenPanel
                  state={cancellation.state}
                  error={cancellation.error}
                  deadline={actions.deadline}
                  onConfirm={cancellation.cancelByToken}
                />
              ) : actions.awaitingPayment ? (
                <ZeffyPaymentBlock formPath={event.zeffy_form_path} />
              ) : member ? (
                <MemberRegistrationPanel
                  status={registration.status}
                  submitting={registration.submitting}
                  isFull={actions.isFull}
                  deadline={actions.deadline}
                  onRegister={registration.register}
                  onCancel={registration.cancel}
                />
              ) : registration.status === "confirmed" ? null : (
                <GuestRegistrationPanel
                  eventId={eventId}
                  submitting={registration.submitting}
                  isFull={actions.isFull}
                  onRegister={registration.register}
                />
              )}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
