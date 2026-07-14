import { useEffect, useState } from "react";
import styles from "./EventsPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { useNavigate } from "../../context/RouterContext";
import { fetchChurches } from "../../lib/api/churches";
import { getEvents } from "../../lib/api/events";
import type { Church, District, EventItem } from "../../types";

const DISTRICTS: District[] = ["Ouest", "Est", "Centre", "Sud", "Outremer"];

function formatDateRange(startIso: string, endIso: string | null): string {
  const start = new Date(startIso);
  const startLabel = start.toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeLabel = start.toLocaleTimeString("fr-CA", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!endIso) return `${startLabel} · ${timeLabel}`;
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    const endTime = end.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
    return `${startLabel} · ${timeLabel} – ${endTime}`;
  }
  const endLabel = end.toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [district, setDistrict] = useState("");
  const [churchId, setChurchId] = useState("");
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchChurches().then(setChurches).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    getEvents({
      district: district || undefined,
      church_id: churchId ? Number(churchId) : undefined,
      upcoming_only: upcomingOnly,
    })
      .then((result) => setEvents(result.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, [district, churchId, upcomingOnly]);

  return (
    <div className={styles.page}>
      <SiteHeader activePage="evenements" />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>📅 Agenda</span>
          <h1 className={styles.heroTitle}>Événements</h1>
          <p className={styles.heroSubtitle}>
            Retrouvez les rencontres, conférences et activités de la mission et
            de ses églises affiliées.
          </p>
        </div>
      </section>

      <main className={styles.main}>
        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          >
            <option value="">Tous les districts</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            className={styles.filterSelect}
            value={churchId}
            onChange={(e) => setChurchId(e.target.value)}
          >
            <option value="">Toutes les églises</option>
            {churches.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <label className={styles.filterCheckbox}>
            <input
              type="checkbox"
              checked={upcomingOnly}
              onChange={(e) => setUpcomingOnly(e.target.checked)}
            />
            À venir seulement
          </label>
        </div>

        {error && (
          <p className={styles.errorMsg} role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className={styles.stateMsg}>Chargement…</p>
        ) : events.length === 0 ? (
          <p className={styles.stateMsg}>Aucun événement trouvé.</p>
        ) : (
          <div className={styles.grid}>
            {events.map((event) => {
              const isFull =
                event.max_participants !== null && (event.spots_left ?? 0) <= 0;
              return (
                <article key={event.id} className={styles.card}>
                  <div className={styles.cardDate}>
                    {formatDateRange(event.date_start, event.date_end)}
                  </div>
                  <div className={styles.cardBody}>
                    <h2 className={styles.cardTitle}>{event.title}</h2>
                    {event.location && (
                      <p className={styles.cardMeta}>📍 {event.location}</p>
                    )}
                    <div className={styles.cardBadges}>
                      {event.district && (
                        <span className={styles.badge}>{event.district}</span>
                      )}
                      {event.max_participants !== null ? (
                        <span className={isFull ? styles.spotsFull : styles.spotsLeft}>
                          {isFull
                            ? "Complet"
                            : `${event.spots_left} place${event.spots_left! > 1 ? "s" : ""} restante${event.spots_left! > 1 ? "s" : ""}`}
                        </span>
                      ) : (
                        <span className={styles.badge}>Places illimitées</span>
                      )}
                    </div>
                    <button
                      className={styles.btnDetail}
                      onClick={() => navigate("evenements", { event: String(event.id) })}
                    >
                      Voir détail
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
