import { useState, useEffect } from "react";
import styles from "./AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { usePendingCount } from "../../hooks/usePendingCount";
import { ALL_NAV_ITEMS, groupOf, toNavSections, visibleNavItems } from "./AdminNav";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";
import { ADMIN_PANELS } from "./adminPanels";
import { DashboardPanel } from "./DashboardPanel";
import { MembresPanel } from "./MembresPanel";
import type { Section } from "./AdminNav";
import type { MemberStatus } from "../../types";

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

export function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { count: pendingCount, refresh: refreshPending } = usePendingCount();

  const isGlobalAdmin = user?.is_global_admin ?? false;
  // Un utilisateur dont le seul rôle est « organisateur » n'a accès qu'aux Événements.
  const isOrganisateurOnly = user?.roles.length === 1 && user.roles[0] === "organisateur";
  const navItems = visibleNavItems(ALL_NAV_ITEMS, { isGlobalAdmin, isOrganisateurOnly });

  const [section, setSection] = useState<Section>(isOrganisateurOnly ? "evenements" : "dashboard");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initialGroup = groupOf(section);
    return new Set(initialGroup ? [initialGroup] : []);
  });
  const [membresInitialStatus, setMembresInitialStatus] = useState<MemberStatus | undefined>();

  useEffect(() => {
    const group = groupOf(section);
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

  function selectSection(next: Section) {
    setSection(next);
    setMembresInitialStatus(undefined);
  }

  const activeLabel = navItems.find((i) => i.id === section)?.label ?? "Administration";

  function renderPanel() {
    if (section === "dashboard") return <DashboardPanel onNavigate={setSection} />;
    if (section === "membres") {
      return (
        <MembresPanel
          initialStatus={membresInitialStatus}
          key={membresInitialStatus ?? "all"}
        />
      );
    }
    const panel = ADMIN_PANELS[section];
    return panel ? panel() : <PlaceholderPanel label={activeLabel} />;
  }

  return (
    <div className={styles.layout}>
      <AdminSidebar
        sections={toNavSections(navItems)}
        active={section}
        expandedGroups={expandedGroups}
        pendingCount={pendingCount}
        onSelect={selectSection}
        onToggleGroup={toggleGroup}
        onBack={() => navigate("home")}
      />

      <div className={styles.main}>
        <AdminTopBar
          title={activeLabel}
          pendingCount={pendingCount}
          userEmail={user?.email}
          onShowPending={() => {
            setSection("membres");
            setMembresInitialStatus("pending");
            refreshPending();
          }}
          onLogout={logout}
        />

        <main className={styles.content}>{renderPanel()}</main>
      </div>
    </div>
  );
}
