import { useState, useEffect } from "react";
import styles from "./AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "../../context/RouterContext";
import { useRbac } from "../../hooks/useRbac";
import type { Role, Permission } from "../../types";
import { EglisesPanel } from "./EglisesPanel";
import { MembresPanel } from "./MembresPanel";

// ── Navigation sidebar ────────────────────────────────────────────────────────

type Section =
  | "membres"
  | "eglises"
  | "dons"
  | "sermons"
  | "evenements"
  | "pages"
  | "utilisateurs";

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: "membres", label: "Membres", icon: "👥" },
  { id: "eglises", label: "Églises", icon: "⛪" },
  { id: "dons", label: "Dons", icon: "💝" },
  { id: "sermons", label: "Sermons", icon: "🎙" },
  { id: "evenements", label: "Événements", icon: "📅" },
  { id: "pages", label: "Pages & Menu", icon: "📄" },
  { id: "utilisateurs", label: "Utilisateurs", icon: "🔑" },
];

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

  const [section, setSection] = useState<Section>("utilisateurs");
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
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${section === item.id ? styles.navItemActive : ""}`}
              onClick={() => {
                setSection(item.id);
                setEditingRoleId(null);
                setCreateError("");
              }}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
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
            <div className={styles.userInfo}>
              <span className={styles.userEmail}>{user?.email}</span>
              <span className={styles.userRoles}>{user?.roles.join(", ")}</span>
            </div>
            <button className={styles.logoutBtn} onClick={logout}>
              Déconnexion
            </button>
          </div>
        </header>

        {/* Content */}
        <main className={styles.content}>
          {section === "utilisateurs" ? (
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
          ) : section === "eglises" ? (
              <EglisesPanel />
          ) : section === "membres" ? (
              <MembresPanel />
          ) : (
              <PlaceholderPanel label={activeLabel} />
          )}
        </main>
      </div>
    </div>
  );
}
