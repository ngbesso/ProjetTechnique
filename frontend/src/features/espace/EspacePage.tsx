import { useEffect, useState } from "react";
import admin from "../admin/AdminPage.module.css";
import styles from "./EspacePage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { useChurches } from "../../hooks/useChurches";
import { useParameters } from "../../hooks/useParameters";
import { useDonations } from "../../hooks/useDonations";
import { fetchMyProfile, updateMyProfile } from "../../lib/api/members";
import { fetchMyFormationRegistrations } from "../../lib/api/formations";
import { validatePhone, validateAddress } from "../../lib/validation";
import type { Member, MemberSelfInput, MyFormationRegistration } from "../../types";

// ── Constantes ────────────────────────────────────────────────────────────────

type Section = "profil" | "dons" | "inscriptions";

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: "profil", label: "Mon profil", icon: "👤" },
  { id: "dons", label: "Mes dons", icon: "💝" },
  { id: "inscriptions", label: "Mes inscriptions", icon: "🎓" },
];

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

function formatPrice(price: number): string {
  return price === 0 ? "Gratuit" : `${price.toFixed(2)} $`;
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
          ) : (
            <InscriptionsSection />
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
  const { values: sexeOptions, load: loadSexe } = useParameters("sexe");
  const { values: familyOptions, load: loadFamily } = useParameters("family_status");

  useEffect(() => {
    fetchMyProfile()
      .then((data) => {
        setM(data);
        setMember(data);
      })
      .catch(() => setError("Aucune fiche membre n'est liée à votre compte."))
      .finally(() => setLoading(false));
    loadSexe();
    loadFamily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSexe, loadFamily]);

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
        sexe: m.sexe,
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
              <label className={styles.label} htmlFor="sexe">Sexe</label>
              <select
                id="sexe"
                className={admin.select}
                value={m.sexe ?? ""}
                onChange={(e) => setM({ ...m, sexe: e.target.value || null })}
              >
                <option value="">—</option>
                {sexeOptions.map((s) => (
                  <option key={s.id} value={s.label}>{s.label}</option>
                ))}
              </select>
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

function RegistrationCard({ reg, isPast }: { reg: MyFormationRegistration; isPast?: boolean }) {
  return (
    <div className={`${styles.regCard} ${isPast ? styles.pastReg : ""}`}>
      <div>
        <p className={styles.regTitle}>{reg.formation.title}</p>
        <p className={styles.regMeta}>
          {formatLongDate(reg.formation.formation_date)} · {reg.formation.instructor}
        </p>
      </div>
      <span className={styles.regPrice}>{formatPrice(reg.formation.price)}</span>
    </div>
  );
}

function InscriptionsSection() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<MyFormationRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyFormationRegistrations()
      .then(setRegistrations)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className={admin.stateMsg}>Chargement…</p>;

  const today = new Date().toISOString().split("T")[0];
  const upcoming = registrations
    .filter((r) => r.formation.formation_date >= today)
    .sort((a, b) => a.formation.formation_date.localeCompare(b.formation.formation_date));
  const past = registrations
    .filter((r) => r.formation.formation_date < today)
    .sort((a, b) => b.formation.formation_date.localeCompare(a.formation.formation_date));

  return (
    <div className={admin.rbacWrapper}>
      {error && <p className={admin.errorMsg} role="alert">{error}</p>}

      {/* Formations — un futur module « Événements » pourra suivre le même schéma */}
      <section className={admin.card}>
        <h3 className={admin.cardTitle}>Formations</h3>

        {registrations.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyIcon}>🎓</p>
            <p>Vous n'êtes inscrit(e) à aucune formation pour le moment.</p>
            <button className={admin.btnPrimary} onClick={() => navigate("home")}>
              Voir les formations
            </button>
          </div>
        ) : (
          <>
            <h4 className={styles.subGroupTitle}>À venir</h4>
            {upcoming.length === 0 ? (
              <p className={admin.empty}>Aucune formation à venir.</p>
            ) : (
              upcoming.map((r) => <RegistrationCard key={r.id} reg={r} />)
            )}

            <h4 className={styles.subGroupTitle}>Passées</h4>
            {past.length === 0 ? (
              <p className={admin.empty}>Aucune formation passée.</p>
            ) : (
              past.map((r) => <RegistrationCard key={r.id} reg={r} isPast />)
            )}
          </>
        )}
      </section>
    </div>
  );
}
