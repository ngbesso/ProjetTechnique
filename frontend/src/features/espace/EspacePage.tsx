import { useEffect, useState } from "react";
import admin from "../admin/AdminPage.module.css";
import styles from "./EspacePage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { useChurches } from "../../hooks/useChurches";
import { useParameters } from "../../hooks/useParameters";
import { useDonations } from "../../hooks/useDonations";
import { fetchMyProfile, updateMyProfile } from "../../lib/api/members";
import { fetchMyEventRegistrations, getEvents } from "../../lib/api/events";
import { createPrayerRequest, fetchMyPrayerRequests } from "../../lib/api/prayerRequests";
import { createVolunteerRequest, fetchMyVolunteerRequests } from "../../lib/api/volunteerRequests";
import { validatePhone, validateAddress } from "../../lib/validation";
import type {
  EventItem,
  Member,
  MemberSelfInput,
  MyEventRegistration,
  PrayerRequest,
  PrayerRequestStatus,
  VolunteerRequest,
  VolunteerRequestStatus,
} from "../../types";

// ── Constantes ────────────────────────────────────────────────────────────────

type Section = "profil" | "dons" | "inscriptions" | "priere" | "benevolat";

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: "profil", label: "Mon profil", icon: "👤" },
  { id: "dons", label: "Mes dons", icon: "💝" },
  { id: "inscriptions", label: "Mes inscriptions", icon: "🎓" },
  { id: "priere", label: "Demande de prière", icon: "🙏" },
  { id: "benevolat", label: "Bénévolat", icon: "🤝" },
];

const PRAYER_STATUS_LABEL: Record<PrayerRequestStatus, string> = {
  new: "Nouvelle",
  handled: "Traitée",
};

const VOLUNTEER_STATUS_LABEL: Record<VolunteerRequestStatus, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Refusée",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Actif",
  pending: "En attente",
  inactive: "Inactif",
  rejected: "Refusé",
};

const CATEGORY_LABELS: Record<string, string> = {
  soutien_spirituel: "Soutien spirituel",
  action_communautaire: "Action communautaire",
  developpement: "Développement",
};

function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatEventDateTime(iso: string): string {
  const d = new Date(iso);
  const dateLabel = d.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
  const timeLabel = d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} · ${timeLabel}`;
}

// ── Page principale ───────────────────────────────────────────────────────────

export function EspacePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("profil");
  const { churches, load: loadChurches } = useChurches();

  const isAdmin = user?.is_global_admin || user?.roles.includes("admin");
  // Un admin n'a généralement pas de fiche membre : /espace serait vide pour
  // lui. On vérifie et on le renvoie vers son tableau de bord le cas échéant —
  // sauf s'il a effectivement une fiche membre (ex. pasteur aussi inscrit).
  const [checkingAdminProfile, setCheckingAdminProfile] = useState(!!isAdmin);

  useEffect(() => {
    if (!isAdmin) return;
    fetchMyProfile()
      .then(() => setCheckingAdminProfile(false))
      .catch(() => navigate("admin"));
  }, [isAdmin, navigate]);

  useEffect(() => {
    loadChurches();
  }, [loadChurches]);

  function churchName(id: number | null | undefined): string {
    return churches.find((c) => c.id === id)?.name ?? "—";
  }

  const activeLabel = NAV_ITEMS.find((i) => i.id === section)?.label ?? "Mon espace";

  if (checkingAdminProfile) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        Chargement…
      </div>
    );
  }

  return (
    <div className={admin.layout}>
      {/* ── Sidebar ── */}
      <aside className={admin.sidebar}>
        <button
          className={`${admin.sidebarBrand} ${styles.sidebarBrandBtn}`}
          onClick={() => navigate("home")}
        >
          <div className={admin.brandIcon}>+</div>
          <div>
            <p className={admin.brandName}>Mission Évangélique</p>
            <p className={admin.brandSub}>Mon espace</p>
          </div>
        </button>

        <nav className={admin.sidebarNav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`${admin.navItem} ${section === item.id ? admin.navItemActive : ""}`}
              onClick={() => setSection(item.id)}
            >
              <span className={admin.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
          <button className={styles.logoutNavItem} onClick={logout}>
            <span className={admin.navIcon}>🚪</span>
            Se déconnecter
          </button>
        </nav>
      </aside>

      {/* ── Main ── */}
      <div className={admin.main}>
        <header className={admin.topBar}>
          <h1 className={admin.topTitle}>{activeLabel}</h1>
        </header>

        <main className={admin.content}>
          {section === "profil" ? (
            <ProfilSection churchName={churchName} />
          ) : section === "dons" ? (
            <DonsSection churchName={churchName} />
          ) : section === "inscriptions" ? (
            <InscriptionsSection />
          ) : section === "priere" ? (
            <PriereSection />
          ) : (
            <BenevolatSection />
          )}
        </main>
      </div>
    </div>
  );
}

// ── Section : Mon profil ─────────────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.fieldGroup}>
      <label className={styles.label}>
        {label} <span className={styles.lockIcon} aria-hidden>🔒</span>
      </label>
      <div className={styles.readOnlyValue}>{value || "—"}</div>
    </div>
  );
}

function ProfilSection({ churchName }: { churchName: (id: number | null | undefined) => string }) {
  const { member: contextMember, setMember } = useAuth();
  const [m, setM] = useState<Member | null>(contextMember);
  const [loading, setLoading] = useState(!contextMember);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ telephone?: string; address?: string }>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const { values: familyOptions, load: loadFamily } = useParameters("family_status");

  useEffect(() => {
    fetchMyProfile()
      .then((data) => {
        setM(data);
        setMember(data);
      })
      .catch(() => setError("Aucune fiche membre n'est liée à votre compte."))
      .finally(() => setLoading(false));
    loadFamily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFamily]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!m) return;

    const errs = {
      telephone: validatePhone(m.telephone ?? "") ?? undefined,
      address: validateAddress(m.address ?? "") ?? undefined,
    };
    const hasErrors = Object.values(errs).some(Boolean);
    setFieldErrors(errs);
    if (hasErrors) return;

    setBusy(true);
    setSaved(false);
    setError("");
    try {
      const payload: MemberSelfInput = {
        address: m.address,
        telephone: m.telephone,
        family_status: m.family_status,
      };
      const updated = await updateMyProfile(payload);
      setM(updated);
      setMember(updated);
      setSaved(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className={admin.stateMsg}>Chargement…</p>;
  if (!m) return <p className={admin.errorMsg} role="alert">{error || "Aucune fiche membre associée à ce compte."}</p>;

  const initials = `${m.first_name[0] ?? ""}${m.last_name[0] ?? ""}`.toUpperCase();

  return (
    <div className={admin.rbacWrapper}>
      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.heroInfo}>
          <p className={styles.heroName}>{m.first_name} {m.last_name}</p>
          <div className={styles.heroMeta}>
            <span className={`${styles.statusBadge} ${styles[m.status] ?? ""}`}>
              {STATUS_LABEL[m.status] ?? m.status}
            </span>
            {m.member_code && <span className={styles.memberCode}>{m.member_code}</span>}
            <span className={styles.churchTag}>⛪ {churchName(m.church_id)}</span>
          </div>
        </div>
      </div>

      {saved && (
        <p className={styles.successMsg}><span>✓</span> Profil mis à jour avec succès.</p>
      )}
      {error && <p className={admin.errorMsg} role="alert">{error}</p>}

      {/* ── Identité (lecture seule) ── */}
      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Informations personnelles</h3>
        <div className={styles.grid2}>
          <ReadOnlyField label="Prénom" value={m.first_name} />
          <ReadOnlyField label="Nom" value={m.last_name} />
          <ReadOnlyField label="Date de naissance" value={m.birth_date ? formatLongDate(m.birth_date) : "—"} />
          <ReadOnlyField label="Courriel" value={m.email} />
          <ReadOnlyField label="Sexe" value={m.sexe ?? "—"} />
        </div>
        <p className={styles.lockNote}>
          🔒 Pour modifier ces informations, contactez votre église.
        </p>
      </section>

      {/* ── Statut (lecture seule) ── */}
      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Statut du compte</h3>
        <div className={styles.grid2}>
          <ReadOnlyField label="Statut" value={STATUS_LABEL[m.status] ?? m.status} />
          <ReadOnlyField label="Numéro de membre" value={m.member_code ?? "—"} />
          <ReadOnlyField label="Église" value={churchName(m.church_id)} />
          <ReadOnlyField label="Baptisé(e)" value={m.is_baptized ? "Oui" : "Non"} />
        </div>
      </section>

      {/* ── Coordonnées (modifiable) ── */}
      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Modifier mes coordonnées</h3>
        <form onSubmit={save}>
          <div className={styles.grid2}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="address">Adresse</label>
              <input
                id="address"
                className={admin.input}
                value={m.address ?? ""}
                placeholder="ex. : 123 Rue principale, Montréal, QC"
                onChange={(e) => {
                  setM({ ...m, address: e.target.value || null });
                  setFieldErrors((fe) => ({ ...fe, address: undefined }));
                }}
              />
              {fieldErrors.address && <p className={admin.fieldError}>{fieldErrors.address}</p>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="telephone">Téléphone</label>
              <input
                id="telephone"
                className={admin.input}
                type="tel"
                value={m.telephone ?? ""}
                placeholder="ex. : 514-123-4567"
                onChange={(e) => {
                  setM({ ...m, telephone: e.target.value || null });
                  setFieldErrors((fe) => ({ ...fe, telephone: undefined }));
                }}
              />
              {fieldErrors.telephone && <p className={admin.fieldError}>{fieldErrors.telephone}</p>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="family_status">Statut matrimonial</label>
              <select
                id="family_status"
                className={admin.select}
                value={m.family_status ?? ""}
                onChange={(e) => setM({ ...m, family_status: e.target.value || null })}
              >
                <option value="">—</option>
                {familyOptions.map((f) => (
                  <option key={f.id} value={f.label}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={admin.btnPrimary} disabled={busy}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

// ── Section : Mes dons ───────────────────────────────────────────────────────

function DonsSection({ churchName }: { churchName: (id: number | null | undefined) => string }) {
  const navigate = useNavigate();
  const { donations, loading, error, load } = useDonations();

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className={admin.stateMsg}>Chargement…</p>;

  const currentYear = new Date().getFullYear();
  const totalsByCurrency = donations
    .filter((d) => new Date(d.created_at).getFullYear() === currentYear)
    .reduce<Record<string, number>>((acc, d) => {
      acc[d.currency] = (acc[d.currency] ?? 0) + d.amount;
      return acc;
    }, {});

  return (
    <div className={admin.rbacWrapper}>
      {error && <p className={admin.errorMsg} role="alert">{error}</p>}

      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Total {currentYear}</h3>
        {Object.keys(totalsByCurrency).length === 0 ? (
          <p className={admin.empty}>Aucun don cette année.</p>
        ) : (
          <div className={styles.totalsRow}>
            {Object.entries(totalsByCurrency).map(([cur, amt]) => (
              <span key={cur} className={styles.totalBadge}>
                {amt.toLocaleString("fr-CA", { style: "currency", currency: cur, maximumFractionDigits: 2 })}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className={admin.listCard}>
        <div className={admin.listHeader}>
          <h3 className={admin.cardTitle} style={{ margin: 0 }}>
            Historique des dons ({donations.length})
          </h3>
        </div>

        {donations.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyIcon}>💝</p>
            <p>Aucun don pour le moment.</p>
            <button className={admin.btnPrimary} onClick={() => navigate("donation")}>
              ♥ Faire un don
            </button>
          </div>
        ) : (
          <div className={admin.listBody}>
            <table className={admin.table}>
              <thead>
                <tr>
                  <th className={admin.th}>Date</th>
                  <th className={admin.th}>Église</th>
                  <th className={admin.th}>Catégorie</th>
                  <th className={admin.th}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.id}>
                    <td className={admin.td}>{new Date(d.created_at).toLocaleDateString("fr-CA")}</td>
                    <td className={admin.td}>{churchName(d.church_id)}</td>
                    <td className={admin.td}>{d.category ? CATEGORY_LABELS[d.category] ?? d.category : "—"}</td>
                    <td className={admin.td}>
                      <strong>{d.amount.toFixed(2)}</strong> {d.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Section : Mes inscriptions ───────────────────────────────────────────────

function EventRegistrationCard({ reg, isPast }: { reg: MyEventRegistration; isPast?: boolean }) {
  const format = reg.event.format;
  const showLink = format === "en_ligne" || format === "hybride";
  const showLocation = format !== "en_ligne" && reg.event.location;
  return (
    <div className={`${styles.regCard} ${isPast ? styles.pastReg : ""}`}>
      <div>
        <p className={styles.regTitle}>{reg.event.title}</p>
        <p className={styles.regMeta}>
          {formatEventDateTime(reg.event.date_start)}
          {format === "en_ligne" ? " · En ligne" : showLocation ? ` · ${reg.event.location}` : ""}
        </p>
        {showLink && reg.event.online_link && !isPast && (
          <p className={styles.regMeta}>
            🌐{" "}
            <a href={reg.event.online_link} target="_blank" rel="noreferrer">
              {reg.event.online_link}
            </a>
          </p>
        )}
      </div>
      <span className={styles.regPrice}>{reg.event.category}</span>
    </div>
  );
}

function InscriptionsSection() {
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

// ── Section : Demande de prière ──────────────────────────────────────────────

function PriereSection() {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sent, setSent] = useState(false);

  function load() {
    setLoading(true);
    fetchMyPrayerRequests()
      .then(setRequests)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setSendError("");
    setSent(false);
    try {
      await createPrayerRequest({ message: message.trim() });
      setMessage("");
      setSent(true);
      load();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={admin.rbacWrapper}>
      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Nouvelle demande de prière</h3>
        <form onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="prayer-message">Votre demande</label>
            <textarea
              id="prayer-message"
              className={admin.input}
              rows={4}
              placeholder="Partagez votre sujet de prière…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          {sendError && <p className={admin.errorMsg} role="alert">{sendError}</p>}
          <div className={styles.formActions}>
            <button type="submit" className={admin.btnPrimary} disabled={sending}>
              {sending ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </form>
      </section>

      {sent && (
        <p className={styles.successMsg}><span>✓</span> Votre demande de prière a été envoyée.</p>
      )}
      {error && <p className={admin.errorMsg} role="alert">{error}</p>}

      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Mes demandes</h3>
        {loading ? (
          <p className={admin.stateMsg}>Chargement…</p>
        ) : requests.length === 0 ? (
          <p className={admin.empty}>Aucune demande envoyée pour le moment.</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className={styles.requestCard}>
              <p className={styles.requestMessage}>{r.message}</p>
              <div className={styles.requestMeta}>
                <span className={styles.requestDate}>{formatEventDateTime(r.created_at)}</span>
                <span className={`${styles.requestBadge} ${styles[r.status]}`}>
                  {PRAYER_STATUS_LABEL[r.status]}
                </span>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

// ── Section : Bénévolat ──────────────────────────────────────────────────────

function BenevolatSection() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [requests, setRequests] = useState<VolunteerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventId, setEventId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sent, setSent] = useState(false);

  function load() {
    setLoading(true);
    setError("");
    Promise.all([getEvents({ upcoming_only: true, limit: 100 }), fetchMyVolunteerRequests()])
      .then(([evRes, reqs]) => {
        setEvents(evRes.items);
        setRequests(reqs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId) return;
    setSending(true);
    setSendError("");
    setSent(false);
    try {
      await createVolunteerRequest({
        event_id: Number(eventId),
        message: message.trim() || undefined,
      });
      setEventId("");
      setMessage("");
      setSent(true);
      load();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p className={admin.stateMsg}>Chargement…</p>;

  return (
    <div className={admin.rbacWrapper}>
      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Proposer mon aide</h3>
        {events.length === 0 ? (
          <p className={admin.empty}>Aucun événement à venir pour le moment.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="volunteer-event">Événement</label>
              <select
                id="volunteer-event"
                className={admin.select}
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                required
              >
                <option value="">Choisir un événement…</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
            <div className={styles.fieldGroup} style={{ marginTop: "0.75rem" }}>
              <label className={styles.label} htmlFor="volunteer-message">Message (optionnel)</label>
              <textarea
                id="volunteer-message"
                className={admin.input}
                rows={3}
                placeholder="Précisez vos disponibilités ou compétences…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            {sendError && <p className={admin.errorMsg} role="alert">{sendError}</p>}
            <div className={styles.formActions}>
              <button type="submit" className={admin.btnPrimary} disabled={sending}>
                {sending ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </form>
        )}
      </section>

      {sent && (
        <p className={styles.successMsg}><span>✓</span> Votre demande de bénévolat a été envoyée.</p>
      )}
      {error && <p className={admin.errorMsg} role="alert">{error}</p>}

      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Mes demandes</h3>
        {requests.length === 0 ? (
          <p className={admin.empty}>Aucune demande envoyée pour le moment.</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className={styles.requestCard}>
              <p className={styles.requestMessage}>
                <strong>{r.event_title}</strong>
                {r.message && <> — {r.message}</>}
              </p>
              <div className={styles.requestMeta}>
                <span className={styles.requestDate}>{formatEventDateTime(r.created_at)}</span>
                <span className={`${styles.requestBadge} ${styles[r.status]}`}>
                  {VOLUNTEER_STATUS_LABEL[r.status]}
                </span>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
