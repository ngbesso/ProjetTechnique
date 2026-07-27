import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useRbac } from "../../hooks/useRbac";
import type { Role } from "../../types";

export function RbacPanel() {
  const { roles, permissions, loading, error, load, addRole, saveRolePermissions } =
    useRbac();

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [editingPerms, setEditingPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

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

  // Combine RBAC error with create error for display
  const displayError = createError || error;

  if (loading) return <p className={styles.stateMsg}>Chargement…</p>;
  if (displayError) return <p className={styles.errorMsg} role="alert">{displayError}</p>;

  return (
    <div className={styles.rbacWrapper}>
      {/* Create role */}
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Créer un rôle</h3>
        <form onSubmit={handleCreateRole} className={styles.inlineForm}>
          <input
            className={styles.input}
            placeholder="Nom du rôle"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            required
          />
          <input
            className={styles.input}
            placeholder="Description (optionnel)"
            value={newRoleDesc}
            onChange={(e) => setNewRoleDesc(e.target.value)}
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
                          onChange={() => togglePerm(p.code)}
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
                      onClick={() => setEditingRoleId(null)}
                      disabled={saving}
                    >
                      Annuler
                    </button>
                    <button
                      className={styles.btnPrimary}
                      onClick={savePerms}
                      disabled={saving}
                    >
                      {saving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className={styles.btnOutline}
                  onClick={() => startEditPerms(role)}
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
