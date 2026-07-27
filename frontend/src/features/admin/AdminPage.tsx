import { useState, useEffect } from "react";
import styles from "./AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { usePendingCount } from "../../hooks/usePendingCount";
import type { MemberStatus } from "../../types";
import { AnniversairesPanel } from "./AnniversairesPanel";
import { AssistantPanel } from "./AssistantPanel";
import { BenevolatPanel } from "./BenevolatPanel";
import { BlogPanel } from "./BlogPanel";
import { DashboardPanel } from "./DashboardPanel";
import { DonsPanel } from "./DonsPanel";
import { EglisesPanel } from "./EglisesPanel";
import { EvenementsPanel } from "./EvenementsPanel";
import { LeadershipPanel } from "./LeadershipPanel";
import { MembresPanel } from "./MembresPanel";
import { NewsPanel } from "./NewsPanel";
import { MinisteresPanel } from "./MinisteresPanel";
import { ParametresPanel } from "./ParametresPanel";
import { PrieresPanel } from "./PrieresPanel";
import { RbacPanel } from "./RbacPanel";
import { SermonsPanel } from "./SermonsPanel";
import { UsersPanel } from "./UsersPanel";

// ── Navigation sidebar ────────────────────────────────────────────────────────

export type Section =
  | "dashboard"
  | "membres"
  | "anniversaires"
  | "ministeres"
  | "eglises"
  | "leadership"
  | "dons"
  | "sermons"
  | "blog"
  | "actualites"
  | "evenements"
  | "prieres"
  | "benevolat"
  | "pages"
  | "utilisateurs"
  | "parametres"
  | "assistant";

interface NavItem {
  id: Section;
  label: string;
  icon: string;
  globalOnly?: boolean;
}

type NavEntry =
  | { kind: "solo"; item: NavItem }
  | { kind: "group"; label: string; icon: string; items: NavItem[] };

const NAV_STRUCTURE: NavEntry[] = [
  { kind: "solo", item: { id: "dashboard", label: "Tableau de bord", icon: "📊" } },
  {
    kind: "group",
    label: "Annuaire",
    icon: "📇",
    items: [
      { id: "membres", label: "Membres", icon: "👥" },
      { id: "ministeres", label: "Ministères", icon: "🙌" },
      { id: "anniversaires", label: "Anniversaires", icon: "🎂", globalOnly: true },
    ],
  },
  {
    kind: "group",
    label: "Demandes",
    icon: "📨",
    items: [
      { id: "prieres", label: "Demandes de prière", icon: "🙏" },
      { id: "benevolat", label: "Bénévolat", icon: "🤝" },
    ],
  },
  {
    kind: "group",
    label: "Publications",
    icon: "📰",
    items: [
      { id: "sermons", label: "Sermons", icon: "🎙" },
      { id: "blog", label: "Blog", icon: "✍️" },
      { id: "actualites", label: "Actualités", icon: "📰" },
    ],
  },
  { kind: "solo", item: { id: "evenements", label: "Événements", icon: "📅" } },
  {
    kind: "group",
    label: "Structure",
    icon: "🏛️",
    items: [
      { id: "eglises", label: "Églises", icon: "⛪", globalOnly: true },
      { id: "leadership", label: "Leadership", icon: "🧑‍💼", globalOnly: true },
    ],
  },
  {
    kind: "group",
    label: "Finances",
    icon: "💰",
    items: [{ id: "dons", label: "Dons", icon: "💝" }],
  },
  {
    kind: "group",
    label: "Système",
    icon: "⚙️",
    items: [
      { id: "utilisateurs", label: "Utilisateurs", icon: "🔑", globalOnly: true },
      { id: "pages", label: "Pages & Menu", icon: "📄", globalOnly: true },
      { id: "parametres", label: "Paramètres", icon: "⚙️", globalOnly: true },
      { id: "assistant", label: "Assistant IA", icon: "🤖", globalOnly: true },
    ],
  },
];

function findGroupLabelForSection(section: Section): string | null {
  for (const entry of NAV_STRUCTURE) {
    if (entry.kind === "group" && entry.items.some((item) => item.id === section)) {
      return entry.label;
    }
  }
  return null;
}

// ── Sub-panel : Placeholder ───────────────────────────────────────────────────

function PlaceholderPanel({ label }: { label: string }) {
  return (
    <div className={styles.card}>
      <div className={styles.placeholderBox}>
        <p className={styles.placeholderIcon}>🚧</p>
        <h3 className={styles.placeholderTitle}>Module « {label} »</h3>
        <p className={styles.placeholderText}>
          Ce module est prévu dans le carnet de produit et sera développé lors
          d'un prochain sprint.
        </p>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { count: pendingCount, refresh: refreshPending } = usePendingCount();

  const isGlobalAdmin = user?.is_global_admin ?? false;
  // Un utilisateur dont le seul rôle est « organisateur » n'a accès qu'aux Événements.
  const isOrganisateurOnly = user?.roles.length === 1 && user.roles[0] === "organisateur";

  const NAV_ENTRIES: NavEntry[] = isOrganisateurOnly
    ? [{ kind: "solo", item: { id: "evenements", label: "Événements", icon: "📅" } }]
    : NAV_STRUCTURE.reduce<NavEntry[]>((acc, entry) => {
        if (entry.kind === "solo") {
          if (!entry.item.globalOnly || isGlobalAdmin) acc.push(entry);
          return acc;
        }
        const items = entry.items.filter((item) => !item.globalOnly || isGlobalAdmin);
        if (items.length > 0) acc.push({ kind: "group", label: entry.label, icon: entry.icon, items });
        return acc;
      }, []);

  const NAV_ITEMS: NavItem[] = NAV_ENTRIES.flatMap((entry) =>
    entry.kind === "solo" ? [entry.item] : entry.items,
  );

  const [section, setSection] = useState<Section>(isOrganisateurOnly ? "evenements" : "dashboard");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [membresInitialStatus, setMembresInitialStatus] = useState<MemberStatus | undefined>();

  // Le groupe contenant la section active se déplie automatiquement (au
  // chargement, et à chaque navigation qui en cible une, p. ex. depuis le
  // tableau de bord ou la cloche de notifications) ; les autres restent tels quels.
  useEffect(() => {
    const label = findGroupLabelForSection(section);
    if (label) {
      setExpandedGroups((prev) => (prev.has(label) ? prev : new Set(prev).add(label)));
    }
  }, [section]);

  function selectSection(id: Section) {
    setSection(id);
    setMembresInitialStatus(undefined);
  }

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  const activeLabel =
    NAV_ITEMS.find((i) => i.id === section)?.label ?? "Administration";

  return (
    <div className={styles.layout}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandIcon}>+</div>
          <div>
            <p className={styles.brandName}>Mission Évangélique</p>
            <p className={styles.brandSub}>Administration</p>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          {NAV_ENTRIES.map((entry) =>
            entry.kind === "solo" ? (
              <button
                key={entry.item.id}
                className={`${styles.navItem} ${section === entry.item.id ? styles.navItemActive : ""}`}
                onClick={() => selectSection(entry.item.id)}
              >
                <span className={styles.navIcon}>{entry.item.icon}</span>
                {entry.item.label}
              </button>
            ) : (
              <div key={entry.label} className={styles.navGroup}>
                <button
                  type="button"
                  className={styles.navGroupHeader}
                  aria-expanded={expandedGroups.has(entry.label)}
                  onClick={() => toggleGroup(entry.label)}
                >
                  <span className={styles.navIcon}>{entry.icon}</span>
                  {entry.label}
                </button>
                {expandedGroups.has(entry.label) && (
                  <div className={styles.navGroupItems}>
                    {entry.items.map((item) => (
                      <button
                        key={item.id}
                        className={`${styles.navItem} ${styles.navSubItem} ${
                          section === item.id ? styles.navItemActive : ""
                        }`}
                        onClick={() => selectSection(item.id)}
                      >
                        <span className={styles.navIcon}>{item.icon}</span>
                        {item.label}
                        {item.id === "membres" && pendingCount > 0 && (
                          <span className={styles.navBadge}>{pendingCount}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.backBtn} onClick={() => navigate("home")}>
            ← Site public
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={styles.main}>
        {/* Top bar */}
        <header className={styles.topBar}>
          <h1 className={styles.topTitle}>{activeLabel}</h1>
          <div className={styles.topUser}>
            <button
              className={styles.notifBtn}
              title={
                pendingCount > 0
                  ? `${pendingCount} demande${pendingCount > 1 ? "s" : ""} en attente`
                  : "Aucune nouvelle demande"
              }
              onClick={() => {
                setSection("membres");
                setMembresInitialStatus("pending");
                refreshPending();
              }}
            >
              🔔
              {pendingCount > 0 && (
                <span className={styles.notifBadge}>{pendingCount}</span>
              )}
            </button>
            <span className={styles.userBadge} title={user?.email}>
              <span aria-hidden>&#128100;</span> Admin
            </span>
            <button className={styles.logoutBtn} onClick={logout}>
              Déconnexion
            </button>
          </div>
        </header>

        {/* Content */}
        <main className={styles.content}>
          {section === "dashboard" ? (
              <DashboardPanel onNavigate={setSection} />
          ) : section === "utilisateurs" ? (
              <>
              <UsersPanel />
              <RbacPanel />
              </>
          ) : section === "eglises" ? (
              <EglisesPanel />
          ) : section === "leadership" ? (
              <LeadershipPanel />
          ) : section === "membres" ? (
              <MembresPanel
                initialStatus={membresInitialStatus}
                key={membresInitialStatus ?? "all"}
              />
          ) : section === "anniversaires" ? (
              <AnniversairesPanel />
          ) : section === "ministeres" ? (
              <MinisteresPanel />
          ) : section === "dons" ? (
              <DonsPanel />
          ) : section === "sermons" ? (
              <SermonsPanel />
          ) : section === "evenements" ? (
              <EvenementsPanel />
          ) : section === "blog" ? (
              <BlogPanel />
          ) : section === "actualites" ? (
              <NewsPanel />
          ) : section === "prieres" ? (
              <PrieresPanel />
          ) : section === "benevolat" ? (
              <BenevolatPanel />
          ) : section === "parametres" ? (
              <ParametresPanel />
          ) : section === "assistant" ? (
              <AssistantPanel />
          ) : (
              <PlaceholderPanel label={activeLabel} />
          )}
        </main>
      </div>
    </div>
  );
}
