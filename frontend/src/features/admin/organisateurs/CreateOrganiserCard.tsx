import { useState } from "react";
import styles from "../AdminPage.module.css";
import { ChurchScopeSelect } from "./ChurchScopeSelect";
import { scopedChurchId } from "./organiserScope";
import type { useToast } from "../../../hooks/useToast";
import type { useUsers } from "../../../hooks/useUsers";
import type { Church, UserAdmin } from "../../../types";

type UsersApi = ReturnType<typeof useUsers>;

interface CreateOrganiserCardProps {
  users: UserAdmin[];
  churches: Church[];
  /** Absent si le rôle n'existe pas en base : la création est alors bloquée. */
  roleId: number | undefined;
  create: UsersApi["create"];
  assign: UsersApi["assign"];
  onChanged: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}

export function CreateOrganiserCard({
  users,
  churches,
  roleId,
  create,
  assign,
  onChanged,
  toast,
}: CreateOrganiserCardProps) {
  const [email, setEmail] = useState("");
  const [churchId, setChurchId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Compte déjà existant pour le courriel saisi : on propose l'attribution du
  // rôle plutôt qu'une création qui échouerait en conflit.
  const [existingUser, setExistingUser] = useState<UserAdmin | null>(null);

  function resetFeedback() {
    setError("");
    setSuccess("");
    setExistingUser(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !roleId) return;

    const alreadyExisting = users.find((u) => u.email.toLowerCase() === trimmed.toLowerCase());
    if (alreadyExisting) {
      setError("");
      setSuccess("");
      setExistingUser(alreadyExisting);
      return;
    }

    setCreating(true);
    resetFeedback();
    try {
      const created = await create(trimmed);
      await assign({
        user_id: created.id,
        role_id: roleId,
        church_id: scopedChurchId(churches, churchId),
      });
      setEmail("");
      setChurchId("");
      setSuccess(
        `Organisateur créé pour ${trimmed} — un lien d'activation lui a été envoyé par courriel.`,
      );
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  async function handlePromoteExisting() {
    if (!existingUser || !roleId) return;
    setCreating(true);
    try {
      await assign({
        user_id: existingUser.id,
        role_id: roleId,
        church_id: scopedChurchId(churches, churchId),
      });
      setSuccess(`Rôle organisateur attribué à ${existingUser.email}.`);
      toast.success(`Rôle organisateur attribué à ${existingUser.email}.`);
      setExistingUser(null);
      setEmail("");
      setChurchId("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      toast.error(err, "Attribution impossible.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Créer un organisateur</h3>
      <p className={styles.helpText}>
        Crée un compte autonome et lui attribue le rôle organisateur. Un lien
        d'activation lui est envoyé par courriel. Si le courriel correspond déjà à
        un compte (par exemple un membre existant), le rôle lui est proposé plutôt
        qu'une nouvelle création.
      </p>
      <form onSubmit={handleCreate} className={styles.inlineForm}>
        <input
          className={styles.input}
          type="email"
          placeholder="courriel@exemple.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); resetFeedback(); }}
          required
        />
        <ChurchScopeSelect value={churchId} onChange={setChurchId} churches={churches} />
        <button
          type="submit"
          className={styles.btnPrimary}
          disabled={creating || !email.trim() || !roleId}
        >
          {creating ? "…" : "+ Créer l'organisateur"}
        </button>
      </form>

      {existingUser && (
        <div style={{ marginTop: ".75rem" }}>
          <p className={styles.helpText} style={{ margin: 0 }}>
            Un compte existe déjà pour <strong>{existingUser.email}</strong>.
          </p>
          <button
            type="button"
            className={styles.btnPrimary}
            style={{ marginTop: ".5rem" }}
            disabled={creating}
            onClick={handlePromoteExisting}
          >
            Attribuer le rôle organisateur à ce compte
          </button>
        </div>
      )}
      {success && (
        <p style={{ color: "var(--vivid-violet)", fontSize: ".875rem", marginTop: ".5rem" }}>
          ✓ {success}
        </p>
      )}
      {error && (
        <p className={styles.errorMsg} role="alert" style={{ marginTop: ".5rem" }}>
          {error}
        </p>
      )}
      {!roleId && (
        <p className={styles.errorMsg} role="alert" style={{ marginTop: ".5rem" }}>
          Le rôle « organisateur » est introuvable.
        </p>
      )}
    </section>
  );
}
