import { useState } from "react";
import styles from "../AdminPage.module.css";
import type { useToast } from "../../../hooks/useToast";
import type { useUsers } from "../../../hooks/useUsers";

type UsersApi = ReturnType<typeof useUsers>;

interface CreateAccountCardProps {
  create: UsersApi["create"];
  toast: ReturnType<typeof useToast>["toast"];
}

/** Création d'un compte autonome, sans fiche membre associée. */
export function CreateAccountCard({ create, toast }: CreateAccountCardProps) {
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      await create(trimmed);
      setEmail("");
      setSuccess(
        `Compte créé pour ${trimmed} — un lien d'activation lui a été envoyé par courriel.`,
      );
      toast.success(`Compte créé pour ${trimmed}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      toast.error(err, "Création impossible.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Créer un compte</h3>
      <p style={{ fontSize: ".875rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
        Crée un compte autonome (sans fiche membre associée) — utile par exemple pour un
        organisateur qui n'a besoin que d'un accès à l'administration. Un lien d'activation
        lui est envoyé par courriel.
      </p>
      <form onSubmit={handleSubmit} className={styles.inlineForm}>
        <input
          className={styles.input}
          type="email"
          placeholder="courriel@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" className={styles.btnPrimary} disabled={creating || !email.trim()}>
          {creating ? "…" : "+ Créer le compte"}
        </button>
      </form>
      {success && (
        <p style={{ color: "var(--vivid-violet)", fontSize: ".875rem", marginTop: ".5rem" }}>
          ✓ {success}
        </p>
      )}
      {error && (
        <p className={styles.errorMsg} role="alert" style={{ marginTop: ".5rem" }}>{error}</p>
      )}
    </section>
  );
}
