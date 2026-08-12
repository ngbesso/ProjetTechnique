import { useState } from "react";
import styles from "../AdminPage.module.css";
import { ChurchScopeSelect } from "./ChurchScopeSelect";
import { scopedChurchId } from "./organiserScope";
import type { useToast } from "../../../hooks/useToast";
import type { useUsers } from "../../../hooks/useUsers";
import type { Church, UserAdmin } from "../../../types";

type UsersApi = ReturnType<typeof useUsers>;

interface AssignOrganiserCardProps {
  /** Comptes ne portant pas encore le rôle. */
  candidates: UserAdmin[];
  churches: Church[];
  roleId: number | undefined;
  assign: UsersApi["assign"];
  onChanged: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}

export function AssignOrganiserCard({
  candidates,
  churches,
  roleId,
  assign,
  onChanged,
  toast,
}: AssignOrganiserCardProps) {
  const [userId, setUserId] = useState("");
  const [churchId, setChurchId] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !roleId) return;
    setError("");
    try {
      await assign({
        user_id: Number(userId),
        role_id: roleId,
        church_id: scopedChurchId(churches, churchId),
      });
      setUserId("");
      setChurchId("");
      onChanged();
      toast.success("Rôle organisateur attribué.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      toast.error(err, "Attribution impossible.");
    }
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Attribuer le rôle à un compte existant</h3>
      <form onSubmit={handleSubmit} className={styles.formGrid}>
        <select
          className={styles.select}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
        >
          <option value="">Compte…</option>
          {candidates.map((u) => (
            <option key={u.id} value={u.id}>{u.email}</option>
          ))}
        </select>
        <ChurchScopeSelect value={churchId} onChange={setChurchId} churches={churches} />
        <button type="submit" className={styles.btnPrimary} disabled={!roleId}>
          Attribuer
        </button>
      </form>
      {error && (
        <p className={styles.errorMsg} role="alert" style={{ marginTop: ".5rem" }}>
          {error}
        </p>
      )}
    </section>
  );
}
