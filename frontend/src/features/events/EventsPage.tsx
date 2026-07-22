import { useEffect, useState } from "react";
import styles from "./EventsPage.module.css";
import { SiteHeader } from "../../components/layout/SiteHeader";
import { SiteFooter } from "../../components/layout/SiteFooter";
import { useNavigate } from "../../context/RouterContext";
import { useParameters } from "../../hooks/useParameters";
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

function formatPrice(price: number | null): string {
  if (!price) return "Gratuit";
  return `${price.toFixed(2)} $`;
}

export function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [district, setDistrict] = useState("");
  const [churchId, setChurchId] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { values: categoryValues, load: loadCategories } = useParameters("event_category");

  useEffect(() => {
    fetchChurches().then(setChurches).catch(() => {});
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    setLoading(true);
    setError("");
    getEvents({
      district: district || undefined,
      church_id: churchId ? Number(churchId) : undefined,
      category: category || undefined,
      upcoming_only: false,
      limit: 100,
    })
      .then((result) => setEvents(result.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, [district, churchId, category]);

  const now = Date.now();
  const upcoming = events
    .filter((e) => new Date(e.date_start).getTime() >= now)
    .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
  const past = events
    .filter((e) => new Date(e.date_start).getTime() < now)
    .sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime());

  function renderCard(event: EventItem, isPast = false) {
    const isFull = event.capacity !== null && (event.spots_left ?? 0) <= 0;
    return (
      <article key={event.id} className={isPast ? `${styles.card} ${styles.cardPast}` : styles.card}>
        {event.image_url && (
          <div className={styles.cardImage}>
            <img src={event.image_url} alt="" />
          </div>
        )}
        <div className={styles.cardDate}>{formatDateRange(event.date_start, event.date_end)}</div>
        <div className={styles.cardBody}>
          <div className={styles.cardBadges}>
            <span className={styles.badge}>{event.category}</span>
            {event.format === "en_ligne" && <span className={styles.badge}>🌐 En ligne</span>}
            {event.format === "hybride" && <span className={styles.badge}>🌐 Hybride</span>}
            {event.district && <span className={styles.badge}>{event.district}</span>}
            {event.price ? <span className={styles.badge}>{formatPrice(event.price)}</span> : null}
          </div>
          <h2 className={styles.cardTitle}>{event.title}</h2>
          {event.format !== "en_ligne" && event.location && (
            <p className={styles.cardMeta}>📍 {event.location}</p>
          )}
          {event.format === "hybride" && <p className={styles.cardMeta}>🌐 Aussi disponible en ligne</p>}
          {event.instructor && <p className={styles.cardMeta}>👤 {event.instructor}</p>}
          {!isPast && (
            <div className={styles.cardBadges}>
              {event.capacity !== null ? (
                <span className={isFull ? styles.spotsFull : styles.spotsLeft}>
                  {isFull
                    ? "Complet"
                    : `${event.spots_left} place${event.spots_left! > 1 ? "s" : ""} restante${event.spots_left! > 1 ? "s" : ""}`}
                </span>
              ) : (
                <span className={styles.badge}>Places illimitées</span>
              )}
            </div>
          )}
          <button
            className={styles.btnDetail}
            onClick={() => navigate("evenements", { event: String(event.id) })}
          >
            Voir détail
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className={styles.page}>
      <SiteHeader activePage="evenements" />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>📅 Agenda</span>
          <h1 className={styles.heroTitle}>Événements</h1>
          <p className={styles.heroSubtitle}>
            Retrouvez les conférences, colloques, croisades, retraites et
            formations de la mission et de ses églises affiliées.
          </p>
        </div>
      </section>

      <main className={styles.main}>
        <div className={styles.filters}>
          <div className={styles.categoryTabs}>
            <button
              type="button"
              className={
                category === ""
                  ? `${styles.categoryTab} ${styles.categoryTabActive}`
                  : styles.categoryTab
              }
              onClick={() => setCategory("")}
            >
              Tous
            </button>
            {categoryValues.map((c) => (
              <button
                key={c.id}
                type="button"
                className={
                  category === c.label
                    ? `${styles.categoryTab} ${styles.categoryTabActive}`
                    : styles.categoryTab
                }
                onClick={() => setCategory(c.label)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className={styles.filterRow}>
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
          </div>
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
          <>
            <section className={styles.group}>
              <h2 className={styles.groupTitle}>À venir</h2>
              {upcoming.length === 0 ? (
                <p className={styles.stateMsg}>Aucun événement à venir.</p>
              ) : (
                <div className={styles.grid}>{upcoming.map((e) => renderCard(e))}</div>
              )}
            </section>

            {past.length > 0 && (
              <section className={styles.group}>
                <h2 className={styles.groupTitle}>Passés</h2>
                <div className={styles.grid}>{past.map((e) => renderCard(e, true))}</div>
              </section>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
