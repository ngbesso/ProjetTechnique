import { useState, useEffect } from "react";
import styles from "./AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { useRbac } from "../../hooks/useRbac";
import { usePendingCount } from "../../hooks/usePendingCount";
import type { MemberStatus, Role, Permission } from "../../types";
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

// ── Sub-panel : Rôles & Permissions ──────────────────────────────────────────

interface RbacPanelProps {
  roles: Role[];
  permissions: Permission[];
  loading: boolean;
  error: string;
  editingRoleId: number | null;
  editingPerms: string[];
  saving: boolean;
  newRoleName: string;
  newRoleDesc: string;
  creating: boolean;
  onNewRoleName: (v: string) => void;
  onNewRoleDesc: (v: string) => void;
  onCreateRole: (e: React.FormEvent) => void;
  onStartEdit: (role: Role) => void;
  onTogglePerm: (code: string) => void;
  onSavePerms: () => void;
  onCancelEdit: () => void;
}

function RbacPanel({
  roles,
  permissions,
  loading,
  error,
  editingRoleId,
  editingPerms,
  saving,
  newRoleName,
  newRoleDesc,
  creating,
  onNewRoleName,
  onNewRoleDesc,
  onCreateRole,
  onStartEdit,
  onTogglePerm,
  onSavePerms,
  onCancelEdit,
}: RbacPanelProps) {
  if (loading) return <p className={styles.stateMsg}>Chargement…</p>;
  if (error) return <p className={styles.errorMsg} role="alert">{error}</p>;

  return (
    <div className={styles.rbacWrapper}>
      {/* Create role */}
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Créer un rôle</h3>
        <form onSubmit={onCreateRole} className={styles.inlineForm}>
          <input
            className={styles.input}
            placeholder="Nom du rôle"
            value={newRoleName}
            onChange={(e) => onNewRoleName(e.target.value)}
            required
          />
          <input
            className={styles.input}
            placeholder="Description (optionnel)"
            value={newRoleDesc}
            onChange={(e) => onNewRoleDesc(e.target.value)}
          />
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={creating}
          >
            {creating ? "Création…" : "+ Ajouter"}
          </button>
        </form>
      </section>

      {/* Roles list */}
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Rôles ({roles.length})</h3>
        {roles.length === 0 && (
          <p className={styles.empty}>Aucun rôle configuré.</p>
        )}
        <div className={styles.roleList}>
          {roles.map((role) => (
            <div key={role.id} className={styles.roleRow}>
              <div className={styles.roleInfo}>
                <span className={styles.roleName}>{role.name}</span>
                {role.description && (
                  <span className={styles.roleDesc}>{role.description}</span>
                )}
                <div className={styles.permTags}>
                  {role.permissions.map((p) => (
                    <span key={p} className={styles.permTag}>
                      {p}
                    </span>
                  ))}
                  {role.permissions.length === 0 && (
                    <span className={styles.noPerms}>Aucune permission</span>
                  )}
                </div>
              </div>

              {editingRoleId === role.id ? (
                <div className={styles.permEditor}>
                  <p className={styles.permEditorTitle}>Permissions</p>
                  <div className={styles.permGrid}>
                    {permissions.map((p) => (
                      <label key={p.code} className={styles.permCheckbox}>
                        <input
                          type="checkbox"
                          checked={editingPerms.includes(p.code)}
                          onChange={() => onTogglePerm(p.code)}
                        />
                        <span>
                          <strong>{p.code}</strong>
                          <span className={styles.permCheckDesc}>
                            {" "}
                            — {p.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className={styles.permActions}>
                    <button
                      className={styles.btnGhost}
                      onClick={onCancelEdit}
                      disabled={saving}
                    >
                      Annuler
                    </button>
                    <button
                      className={styles.btnPrimary}
                      onClick={onSavePerms}
                      disabled={saving}
                    >
                      {saving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className={styles.btnOutline}
                  onClick={() => onStartEdit(role)}
                >
                  Modifier les permissions
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
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
  const { roles, permissions, loading, error, load, addRole, saveRolePermissions } =
    useRbac();

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
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [editingPerms, setEditingPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (section === "utilisateurs") {
      load();
    }
  }, [section, load]);

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
    setEditingRoleId(null);
    setCreateError("");
  }

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      await addRole(newRoleName.trim(), newRoleDesc.trim());
      setNewRoleName("");
      setNewRoleDesc("");
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  function startEditPerms(role: Role) {
    setEditingRoleId(role.id);
    setEditingPerms([...role.permissions]);
  }

  function togglePerm(code: string) {
    setEditingPerms((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  async function savePerms() {
    if (editingRoleId === null) return;
    setSaving(true);
    try {
      await saveRolePermissions(editingRoleId, editingPerms);
      setEditingRoleId(null);
    } catch {
      // error is surfaced by useRbac
    } finally {
      setSaving(false);
    }
  }

  const activeLabel =
    NAV_ITEMS.find((i) => i.id === section)?.label ?? "Administration";

  // Combine RBAC error with create error for display
  const displayError = createError || error;

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
              <RbacPanel
                  roles={roles}
                  permissions={permissions}
                  loading={loading}
                  error={displayError}
                  newRoleName={newRoleName}
                  newRoleDesc={newRoleDesc}
                  creating={creating}
                  editingRoleId={editingRoleId}
                  editingPerms={editingPerms}
                  saving={saving}
                  onNewRoleName={setNewRoleName}
                  onNewRoleDesc={setNewRoleDesc}
                  onCreateRole={handleCreateRole}
                  onStartEdit={startEditPerms}
                  onTogglePerm={togglePerm}
                  onSavePerms={savePerms}
                  onCancelEdit={() => setEditingRoleId(null)}
              />
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
