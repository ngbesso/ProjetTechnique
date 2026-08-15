import { useEffect, useState } from "react";
import admin from "../admin/AdminPage.module.css";
import styles from "./EspacePage.module.css";
import { useNavigate } from "../../context/RouterContext";
import { fetchMyEventRegistrations } from "../../lib/api/events";
import { EventRegistrationCard } from "./EventRegistrationCard";
import type { MyEventRegistration } from "../../types";

export function InscriptionsSection() {
  const navigate = useNavigate();
  const [eventRegs, setEventRegs] = useState<MyEventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyEventRegistrations()
      .then(setEventRegs)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className={admin.stateMsg}>Chargement…</p>;

  const now = Date.now();
  const upcomingEvents = eventRegs
    .filter((r) => new Date(r.event.date_start).getTime() >= now)
    .sort((a, b) => new Date(a.event.date_start).getTime() - new Date(b.event.date_start).getTime());
  const pastEvents = eventRegs
    .filter((r) => new Date(r.event.date_start).getTime() < now)
    .sort((a, b) => new Date(b.event.date_start).getTime() - new Date(a.event.date_start).getTime());

  return (
    <div className={admin.rbacWrapper}>
      {error && <p className={admin.errorMsg} role="alert">{error}</p>}

      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Événements &amp; Formations</h3>

        <h4 className={styles.subGroupTitle}>À venir</h4>
        {upcomingEvents.length === 0 ? (
          <p className={admin.empty}>Aucun événement à venir.</p>
        ) : (
          upcomingEvents.map((r) => <EventRegistrationCard key={r.id} reg={r} />)
        )}

        <h4 className={styles.subGroupTitle}>Passées</h4>
        {pastEvents.length === 0 ? (
          <p className={admin.empty}>Aucun événement passé.</p>
        ) : (
          pastEvents.map((r) => <EventRegistrationCard key={r.id} reg={r} isPast />)
        )}
      </section>

      <div className={styles.inscriptionsActions}>
        <button className={admin.btnPrimary} onClick={() => navigate("evenements")}>
          Voir les événements
        </button>
      </div>
    </div>
  );
}
