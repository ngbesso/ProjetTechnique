import { useState } from "react";
import styles from "../AdminPage.module.css";
import type { useToast } from "../../../hooks/useToast";
import type { useUsers } from "../../../hooks/useUsers";
import type { Church, Role, UserAdmin } from "../../../types";

type UsersApi = ReturnType<typeof useUsers>;

interface AssignRoleCardProps {
  users: UserAdmin[];
  roles: Role[];
  churches: Church[];
  assign: UsersApi["assign"];
  toast: ReturnType<typeof useToast>["toast"];
}

export function AssignRoleCard({ users, roles, churches, assign, toast }: AssignRoleCardProps) {
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [churchId, setChurchId] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !roleId || !churchId) return;
    setError("");
    try {
      await assign({ user_id: +userId, role_id: +roleId, church_id: +churchId });
      setUserId("");
      setRoleId("");
      setChurchId("");
      toast.success("Rôle attribué.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      toast.error(err, "Attribution impossible.");
    }
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Attribuer un rôle</h3>
      <form onSubmit={handleSubmit} className={styles.formGrid}>
        <select className={styles.select} value={userId}
          onChange={(e) => setUserId(e.target.value)} required>
          <option value="">Utilisateur…</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
        </select>
        <select className={styles.select} value={roleId}
          onChange={(e) => setRoleId(e.target.value)} required>
          <option value="">Rôle…</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className={styles.select} value={churchId}
          onChange={(e) => setChurchId(e.target.value)} required>
          <option value="">Église…</option>
          {churches.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.is_mother ? " (mère)" : ""}</option>
          ))}
        </select>
        <button type="submit" className={styles.btnPrimary}>Attribuer</button>
      </form>
      <p className={styles.helpText}>
        Un rôle porté sur l'église mère couvre toutes les affiliées (cascade) ; sur une affiliée,
        il y enferme la personne.
      </p>
      {error && (
        <p className={styles.errorMsg} role="alert" style={{ marginTop: ".5rem" }}>{error}</p>
      )}
    </section>
  );
}
