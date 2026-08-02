import { useCallback, useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { hasPermission, useAuth } from "../../context/AuthContext";
import { useUsers } from "../../hooks/useUsers";
import { useRbac } from "../../hooks/useRbac";
import { useChurches } from "../../hooks/useChurches";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { IconCalendar, IconCheckCircle, IconXCircle } from "../../components/ui/icons";
import { KpiCard } from "../../components/ui/KpiCard";
import { fetchOrganisateursStats } from "../../lib/api/users";
import { formatDate } from "../../lib/format";
import type { AssignmentRead, OrganiserEventCount, UserAdmin } from "../../types";

const ROLE_NAME = "organisateur";

/** Utilisateur doté du rôle organisateur, enrichi de l'attribution concernée
 *  et du nombre d'événements qu'il a créés. */
interface OrganiserRow extends UserAdmin {
  assignment: AssignmentRead;
  event_count: number;
}

const col = createColumnHelper<OrganiserRow>();

export function OrganisateursPanel() {
  const { user } = useAuth();
  const { users, loading, error, load, toggleActive, assign, revoke, create } = useUsers();
  const { roles, load: loadRbac } = useRbac();
  const { churches, load: loadChurches } = useChurches();

  const [eventCounts, setEventCounts] = useState<OrganiserEventCount[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newChurchId, setNewChurchId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  // Compte déjà existant pour le courriel saisi : on propose l'attribution du
  // rôle plutôt qu'une création qui échouerait en conflit.
  const [existingUser, setExistingUser] = useState<UserAdmin | null>(null);

  const [assignUserId, setAssignUserId] = useState("");
  const [assignChurchId, setAssignChurchId] = useState("");
  const [assignError, setAssignError] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const { confirm, dialog } = useConfirm();
  const { toast, toasts } = useToast();

  const canManage = hasPermission(user, "user:manage") && hasPermission(user, "rbac:manage");

  const loadCounts = useCallback(() => {
    fetchOrganisateursStats().then(setEventCounts).catch(() => setEventCounts([]));
  }, []);

  useEffect(() => {
    load();
    loadRbac();
    loadChurches();
    loadCounts();
  }, [load, loadRbac, loadChurches, loadCounts]);

  const organisateurRole = roles.find((r) => r.name === ROLE_NAME);
  const countByUser = new Map(eventCounts.map((c) => [c.user_id, c.event_count]));

  // Un même compte peut porter le rôle sur plusieurs églises : une ligne par
  // attribution, pour que le retrait cible la bonne portée.
  const organisers: OrganiserRow[] = users.flatMap((u) =>
    u.assignments
      .filter((a) => a.role === ROLE_NAME)
      .map((assignment) => ({
        ...u,
        assignment,
        event_count: countByUser.get(u.id) ?? 0,
      })),
  );

  const visibleOrganisers = organisers.filter(
    (o) => !filterQ || o.email.toLowerCase().includes(filterQ.toLowerCase()),
  );

  const uniqueOrganiserIds = new Set(organisers.map((o) => o.id));
  const activeCount = new Set(organisers.filter((o) => o.is_active).map((o) => o.id)).size;
  const totalEvents = [...uniqueOrganiserIds].reduce(
    (sum, id) => sum + (countByUser.get(id) ?? 0),
    0,
  );

  function resetCreateFeedback() {
    setCreateError("");
    setCreateSuccess("");
    setExistingUser(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const email = newEmail.trim();
    if (!email || !organisateurRole) return;

    const alreadyExisting = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (alreadyExisting) {
      setCreateError("");
      setCreateSuccess("");
      setExistingUser(alreadyExisting);
      return;
    }

    setCreating(true);
    resetCreateFeedback();
    try {
      const created = await create(email);
      await assign({
        user_id: created.id,
        role_id: organisateurRole.id,
        church_id: Number(newChurchId) || motherChurchId(),
      });
      setNewEmail("");
      setNewChurchId("");
      setCreateSuccess(
        `Organisateur créé pour ${email} — un lien d'activation lui a été envoyé par courriel.`,
      );
      loadCounts();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  function motherChurchId(): number {
    return churches.find((c) => c.is_mother)?.id ?? churches[0]?.id ?? 0;
  }

  async function handlePromoteExisting() {
    if (!existingUser || !organisateurRole) return;
    setCreating(true);
    try {
      await assign({
        user_id: existingUser.id,
        role_id: organisateurRole.id,
        church_id: Number(newChurchId) || motherChurchId(),
      });
      setCreateSuccess(`Rôle organisateur attribué à ${existingUser.email}.`);
      toast.success(`Rôle organisateur attribué à ${existingUser.email}.`);
      setExistingUser(null);
      setNewEmail("");
      setNewChurchId("");
      loadCounts();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erreur");
      toast.error(err, "Attribution impossible.");
    } finally {
      setCreating(false);
    }
  }

  async function handleAssignExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!assignUserId || !organisateurRole) return;
    setAssignError("");
    try {
      await assign({
        user_id: Number(assignUserId),
        role_id: organisateurRole.id,
        church_id: Number(assignChurchId) || motherChurchId(),
      });
      setAssignUserId("");
      setAssignChurchId("");
      loadCounts();
      toast.success("Rôle organisateur attribué.");
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Erreur");
      toast.error(err, "Attribution impossible.");
    }
  }

  async function handleRevoke(row: OrganiserRow) {
    if (!organisateurRole) return;
    const ok = await confirm({
      title: `Retirer le rôle organisateur à ${row.email} ?`,
      description: `La portée concernée est « ${row.assignment.church_name} ». Les événements déjà créés sont conservés.`,
      confirmLabel: "Retirer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await revoke({
        user_id: row.id,
        role_id: organisateurRole.id,
        church_id: row.assignment.church_id,
      });
      loadCounts();
      toast.success(`Rôle organisateur retiré à ${row.email}.`);
    } catch (err) {
      toast.error(err, "Retrait impossible.");
    }
  }

  const columns = [
    col.accessor("email", { header: "Courriel" }),
    col.accessor((o) => o.assignment.church_name, {
      id: "church",
      header: "Église de rattachement",
    }),
    col.accessor("is_active", {
      header: "Statut",
      cell: (info) => (
        <span
          className={`${styles.badge} ${info.getValue() ? styles.badgeActive : styles.badgeInactive}`}
        >
          {info.getValue() ? "Actif" : "Désactivé"}
        </span>
      ),
    }),
    col.accessor("event_count", { header: "Événements créés" }),
    col.accessor("created_at", {
      header: "Compte créé le",
      cell: (info) => formatDate(info.getValue()),
    }),
    ...(canManage
      ? [
          col.display({
            id: "actions",
            header: "Actions",
            cell: (info) => {
              const o = info.row.original;
              return (
                <div className={styles.actions}>
                  <button
                    className={styles.btnOutlineSm}
                    onClick={() => toggleActive(o.id, !o.is_active)}
                  >
                    {o.is_active ? "Désactiver" : "Réactiver"}
                  </button>
                  <button className={styles.btnDanger} onClick={() => handleRevoke(o)}>
                    Retirer le rôle
                  </button>
                </div>
              );
            },
          }),
        ]
      : []),
  ];

  // Comptes ne portant pas encore le rôle organisateur — candidats à l'attribution.
  const candidates = users.filter((u) => !u.assignments.some((a) => a.role === ROLE_NAME));

  return (
    <div className={styles.rbacWrapper}>
      <div className={styles.kpiGrid}>
        <KpiCard
          color="violet"
          icon={<IconCheckCircle />}
          value={uniqueOrganiserIds.size}
          label="Organisateurs"
        />
        <KpiCard color="emerald" icon={<IconCheckCircle />} value={activeCount} label="Actifs" />
        <KpiCard
          color="rose"
          icon={<IconXCircle />}
          value={uniqueOrganiserIds.size - activeCount}
          label="Désactivés"
        />
        <KpiCard
          color="amber"
          icon={<IconCalendar />}
          value={totalEvents}
          label="Événements créés"
        />
      </div>

      {canManage && (
        <>
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
                value={newEmail}
                onChange={(e) => { setNewEmail(e.target.value); resetCreateFeedback(); }}
                required
              />
              <select
                className={styles.select}
                value={newChurchId}
                onChange={(e) => setNewChurchId(e.target.value)}
              >
                <option value="">Église mère (par défaut)</option>
                {churches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.is_mother ? " (mère)" : ""}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={creating || !newEmail.trim() || !organisateurRole}
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
            {createSuccess && (
              <p style={{ color: "var(--vivid-violet)", fontSize: ".875rem", marginTop: ".5rem" }}>
                ✓ {createSuccess}
              </p>
            )}
            {createError && (
              <p className={styles.errorMsg} role="alert" style={{ marginTop: ".5rem" }}>
                {createError}
              </p>
            )}
            {!organisateurRole && (
              <p className={styles.errorMsg} role="alert" style={{ marginTop: ".5rem" }}>
                Le rôle « organisateur » est introuvable.
              </p>
            )}
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Attribuer le rôle à un compte existant</h3>
            <form onSubmit={handleAssignExisting} className={styles.formGrid}>
              <select
                className={styles.select}
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                required
              >
                <option value="">Compte…</option>
                {candidates.map((u) => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </select>
              <select
                className={styles.select}
                value={assignChurchId}
                onChange={(e) => setAssignChurchId(e.target.value)}
              >
                <option value="">Église mère (par défaut)</option>
                {churches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.is_mother ? " (mère)" : ""}
                  </option>
                ))}
              </select>
              <button type="submit" className={styles.btnPrimary} disabled={!organisateurRole}>
                Attribuer
              </button>
            </form>
            {assignError && (
              <p className={styles.errorMsg} role="alert" style={{ marginTop: ".5rem" }}>
                {assignError}
              </p>
            )}
          </section>
        </>
      )}

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Organisateurs ({visibleOrganisers.length})</h3>

        <div className={styles.inlineForm} style={{ flexWrap: "wrap", marginBottom: "1rem", gap: "0.5rem" }}>
          <input
            className={styles.input}
            placeholder="Rechercher par courriel…"
            value={filterQ}
            style={{ flex: "1 1 200px" }}
            onChange={(e) => setFilterQ(e.target.value)}
          />
        </div>

        {loading ? (
          <p className={styles.stateMsg}>Chargement…</p>
        ) : error ? (
          <p className={styles.errorMsg} role="alert">{error}</p>
        ) : (
          <DataTable
            columns={columns}
            data={visibleOrganisers}
            getRowId={(o) => `${o.id}-${o.assignment.church_id}`}
            emptyMessage="Aucun organisateur."
          />
        )}
      </section>
      {dialog}
      {toasts}
    </div>
  );
}
