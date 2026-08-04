import { useState, useEffect, type ComponentType } from "react";
import styles from "./AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { usePendingCount } from "../../hooks/usePendingCount";
import {
  IconBot,
  IconBriefcase,
  IconCalendar,
  IconChevronRight,
  IconChurch,
  IconClipboardList,
  IconCreditCard,
  IconDollar,
  IconFileText,
  IconGift,
  IconHeart,
  IconKey,
  IconLayoutDashboard,
  IconMic,
  IconNewspaper,
  IconPen,
  IconSettings,
  IconSparkles,
  IconTicket,
  IconTrendingUp,
  IconUserPlus,
  IconUsers,
} from "../../components/ui/icons";
import type { MemberStatus } from "../../types";
import { AnniversairesPanel } from "./AnniversairesPanel";
import { AssistantPanel } from "./AssistantPanel";
import { BenevolatPanel } from "./BenevolatPanel";
import { BlogPanel } from "./BlogPanel";
import { DashboardPanel } from "./DashboardPanel";
import { DemandesMembresPanel } from "./DemandesMembresPanel";
import { DepensesPanel } from "./DepensesPanel";
import { EglisesPanel } from "./EglisesPanel";
import { EvenementsPanel } from "./EvenementsPanel";
import { LeadershipPanel } from "./LeadershipPanel";
import { MembresPanel } from "./MembresPanel";
import { NewsPanel } from "./NewsPanel";
import { MinisteresPanel } from "./MinisteresPanel";
import { OrganisateursPanel } from "./OrganisateursPanel";
import { PagesPanel } from "./PagesPanel";
import { ParametresPanel } from "./ParametresPanel";
import { PrieresPanel } from "./PrieresPanel";
import { RapportPanel } from "./RapportPanel";
import { RbacPanel } from "./RbacPanel";
import { RevenusPanel } from "./RevenusPanel";
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
  | "finances-revenus"
  | "finances-depenses"
  | "finances-rapport"
  | "sermons"
  | "blog"
  | "actualites"
  | "evenements"
  | "organisateurs"
  | "prieres"
  | "benevolat"
  | "demandes-membres"
  | "pages"
  | "utilisateurs"
  | "parametres"
  | "assistant";

interface NavItem {
  id: Section;
  label: string;
  /** Icône vectorielle plutôt qu'un emoji : le rendu des emojis dépend du
   *  système et donne un aspect non fini. */
  icon: ComponentType;
  globalOnly?: boolean;
  group?: string;
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Tableau de bord", icon: IconLayoutDashboard },
  { id: "membres", label: "Membres", icon: IconUsers, group: "Communauté" },
  { id: "anniversaires", label: "Anniversaires", icon: IconGift, globalOnly: true, group: "Communauté" },
  { id: "ministeres", label: "Ministères", icon: IconSparkles, group: "Communauté" },
  { id: "eglises", label: "Églises", icon: IconChurch, globalOnly: true, group: "Organisation" },
  { id: "leadership", label: "Leadership", icon: IconBriefcase, globalOnly: true, group: "Organisation" },
  { id: "finances-revenus", label: "Revenus", icon: IconDollar, globalOnly: true, group: "Finances" },
  { id: "finances-depenses", label: "Dépenses", icon: IconCreditCard, globalOnly: true, group: "Finances" },
  { id: "finances-rapport", label: "Rapport", icon: IconTrendingUp, globalOnly: true, group: "Finances" },
  { id: "sermons", label: "Sermons", icon: IconMic, group: "Contenu" },
  { id: "blog", label: "Blog", icon: IconPen, group: "Contenu" },
  { id: "actualites", label: "Actualités", icon: IconNewspaper, group: "Contenu" },
  { id: "evenements", label: "Événements", icon: IconCalendar, group: "Contenu" },
  { id: "organisateurs", label: "Organisateurs", icon: IconTicket, globalOnly: true, group: "Contenu" },
  { id: "prieres", label: "Demandes de prière", icon: IconHeart, group: "Demandes" },
  { id: "benevolat", label: "Bénévolat", icon: IconUserPlus, group: "Demandes" },
  { id: "demandes-membres", label: "Demandes des membres", icon: IconClipboardList, group: "Demandes" },
  { id: "pages", label: "Pages & Menu", icon: IconFileText, globalOnly: true, group: "Système" },
  { id: "utilisateurs", label: "Utilisateurs", icon: IconKey, globalOnly: true, group: "Système" },
  { id: "parametres", label: "Paramètres", icon: IconSettings, globalOnly: true, group: "Système" },
  { id: "assistant", label: "Assistant IA", icon: IconBot, globalOnly: true },
];

/** Entrées visibles pour un utilisateur donné : un organisateur pur n'accède
 *  qu'aux Événements, les entrées globalOnly sont réservées à l'admin global. */
export function visibleNavItems(
  items: NavItem[],
  { isGlobalAdmin, isOrganisateurOnly }: { isGlobalAdmin: boolean; isOrganisateurOnly: boolean },
): NavItem[] {
  if (isOrganisateurOnly) return items.filter((item) => item.id === "evenements");
  return items.filter((item) => !item.globalOnly || isGlobalAdmin);
}

/** Découpe la liste plate en tranches consécutives partageant un même groupe.
 *  Les entrées hors groupe forment leurs propres tranches. Sert à ce que le
 *  filet vertical puisse courir le long d'un groupe entier. */
export function toNavSections(items: NavItem[]): { group?: string; items: NavItem[] }[] {
  const sections: { group?: string; items: NavItem[] }[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.group === item.group) last.items.push(item);
    else sections.push({ group: item.group, items: [item] });
  }
  return sections;
}

// ── Sub-panel : Placeholder ───────────────────────────────────────────────────

function PlaceholderPanel({ label }: { label: string }) {
  return (
    <div className={styles.card}>
      <div className={styles.placeholderBox}>
        <p className={styles.placeholderIcon} aria-hidden>🚧</p>
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
  const NAV_ITEMS = visibleNavItems(ALL_NAV_ITEMS, { isGlobalAdmin, isOrganisateurOnly });

  const [section, setSection] = useState<Section>(isOrganisateurOnly ? "evenements" : "dashboard");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initialGroup = ALL_NAV_ITEMS.find((i) => i.id === section)?.group;
    return new Set(initialGroup ? [initialGroup] : []);
  });
  const [membresInitialStatus, setMembresInitialStatus] = useState<MemberStatus | undefined>();

  useEffect(() => {
    const group = ALL_NAV_ITEMS.find((i) => i.id === section)?.group;
    if (group) {
      setExpandedGroups((prev) => (prev.has(group) ? prev : new Set(prev).add(group)));
    }
  }, [section]);

  function toggleGroup(group: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  const activeLabel =
    NAV_ITEMS.find((i) => i.id === section)?.label ?? "Administration";
  const navSections = toNavSections(NAV_ITEMS);

  return (
    <div className={styles.layout}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandIcon} aria-hidden>+</div>
          <div>
            <p className={styles.brandName}>Mission Évangélique</p>
            <p className={styles.brandSub}>Administration</p>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          {navSections.map((navSection) => {
            const grouped = navSection.group !== undefined;
            const expanded = grouped ? expandedGroups.has(navSection.group!) : true;
            const entries = navSection.items.map((item) => {
              const Icon = item.icon;
              const isActive = section === item.id;
              // Le pavé plein n'est conservé que pour les entrées hors groupe ;
              // dans un groupe, l'entrée active se signale par une barre
              // d'accent et un fond très discret.
              const activeClass = isActive
                ? grouped
                  ? styles.navItemActive
                  : styles.navItemActiveSolo
                : "";
              return (
                <button
                  key={item.id}
                  className={`${styles.navItem} ${activeClass}`}
                  // Sous 768px le libellé est masqué en CSS et l'icône est
                  // décorative : sans ce nom explicite, le bouton serait
                  // annoncé « bouton » par un lecteur d'écran.
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    setSection(item.id);
                    setMembresInitialStatus(undefined);
                  }}
                >
                  <span className={styles.navIcon} aria-hidden>
                    <Icon />
                  </span>
                  {/* Le libellé est enveloppé pour pouvoir être masqué dans le
                      rail réduit (<768px), où seule l'icône reste. */}
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.id === "membres" && pendingCount > 0 && (
                    <span className={styles.navBadge}>{pendingCount}</span>
                  )}
                </button>
              );
            });

            if (!grouped) {
              return (
                <div key={navSection.items[0].id} className={styles.navSolo}>
                  {entries}
                </div>
              );
            }

            return (
              <div key={navSection.group} className={styles.navGroup}>
                <button
                  type="button"
                  className={styles.navGroupLabel}
                  aria-expanded={expanded}
                  onClick={() => toggleGroup(navSection.group!)}
                >
                  <span className={styles.navGroupText}>{navSection.group}</span>
                  <span
                    className={`${styles.navChevron} ${expanded ? styles.navChevronOpen : ""}`}
                    aria-hidden
                  >
                    <IconChevronRight />
                  </span>
                </button>
                {expanded && <div className={styles.navGroupItems}>{entries}</div>}
              </div>
            );
          })}
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
          ) : section === "finances-revenus" ? (
              <RevenusPanel />
          ) : section === "finances-depenses" ? (
              <DepensesPanel />
          ) : section === "finances-rapport" ? (
              <RapportPanel />
          ) : section === "sermons" ? (
              <SermonsPanel />
          ) : section === "evenements" ? (
              <EvenementsPanel />
          ) : section === "organisateurs" ? (
              <OrganisateursPanel />
          ) : section === "blog" ? (
              <BlogPanel />
          ) : section === "actualites" ? (
              <NewsPanel />
          ) : section === "prieres" ? (
              <PrieresPanel />
          ) : section === "benevolat" ? (
              <BenevolatPanel />
          ) : section === "demandes-membres" ? (
              <DemandesMembresPanel />
          ) : section === "pages" ? (
              <PagesPanel />
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
