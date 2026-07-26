import { useEffect, useRef, useState } from "react";
import adminStyles from "./AdminPage.module.css";
import styles from "./LeadershipPanel.module.css";
import { hasPermission, useAuth } from "../../context/AuthContext";
import { useChurches } from "../../hooks/useChurches";
import { useConfirm } from "../../hooks/useConfirm";
import { useLeaders } from "../../hooks/useLeaders";
import { useParameters } from "../../hooks/useParameters";
import { KpiCard } from "../../components/ui/KpiCard";
import type { Leader, LeaderInput } from "../../types";

const DISTRICTS = ["Ouest", "Est", "Centre", "Sud", "Outremer", "National"];

const EMPTY: LeaderInput = {
  first_name: "",
  last_name: "",
  title: "",
  role: "",
  district: null,
  church_id: null,
  bio: "",
  email: "",
  phone: "",
  years_of_service: null,
};

function leaderToForm(l: Leader): LeaderInput {
  return {
    first_name: l.first_name,
    last_name: l.last_name,
    title: l.title,
    role: l.role,
    district: l.district,
    church_id: l.church_id,
    bio: l.bio ?? "",
    email: l.email ?? "",
    phone: l.phone ?? "",
    years_of_service: l.years_of_service,
  };
}

// ── Icônes KPI ──────────────────────────────────────────────────────────────

function IconCheckCircle() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="8 12 11 15 16 9" />
    </svg>
  );
}

function IconXCircle() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function initials(l: Leader): string {
  return `${l.first_name[0] ?? ""}${l.last_name[0] ?? ""}`.toUpperCase();
}

export function LeadershipPanel() {
  const { user } = useAuth();
  const { leaders, loading, error, loadAdmin, add, edit, remove, uploadPhoto } = useLeaders();
  const { churches, load: loadChurches } = useChurches();
  const { values: roleValues, load: loadRoles } = useParameters("leader_role");
  const { confirm, dialog } = useConfirm();

  const canManage = hasPermission(user, "leader:manage");

  const [form, setForm] = useState<LeaderInput>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const isEditing = editingId !== null;

  const [filterQ, setFilterQ] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterPublished, setFilterPublished] = useState("");

  const photoInputs = useRef<Record<number, HTMLInputElement | null>>({});
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  useEffect(() => {
    loadAdmin();
    loadChurches();
    loadRoles();
  }, [loadAdmin, loadChurches, loadRoles]);

  function applyFilters(overrides?: { q?: string; role?: string; district?: string; is_published?: string }) {
    const q = overrides?.q ?? filterQ;
    const role = overrides?.role ?? filterRole;
    const district = overrides?.district ?? filterDistrict;
    const publishedStr = overrides?.is_published ?? filterPublished;
    loadAdmin({
      q: q.trim() || undefined,
      role: role || undefined,
      district: district || undefined,
      is_published: publishedStr === "" ? undefined : publishedStr === "true",
    });
  }

  function churchLabel(churchId: number | null): string {
    if (churchId === null) return "—";
    return churches.find((c) => c.id === churchId)?.name ?? `#${churchId}`;
  }

  const publishedCount = leaders.filter((l) => l.is_published).length;
  const draftCount = leaders.filter((l) => !l.is_published).length;

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError("");
    setShowModal(true);
  }

  function startEdit(l: Leader) {
    setEditingId(l.id);
    setForm(leaderToForm(l));
    setFormError("");
    setShowModal(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError("");
    setShowModal(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.title.trim()) {
      setFormError("Prénom, nom et titre sont requis.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        ...form,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        title: form.title.trim(),
        // null (pas undefined) : un champ vidé doit être effacé côté serveur.
        // undefined disparaît de JSON.stringify, et exclude_unset="non fourni"
        // ferait que le backend ignore silencieusement l'effacement voulu.
        bio: form.bio || null,
        email: form.email || null,
        phone: form.phone || null,
      };
      if (editingId !== null) {
        await edit(editingId, payload);
      } else {
        await add(payload);
      }
      cancelEdit();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    const ok = await confirm({
      title: `Supprimer « ${name} » du leadership ?`,
      description: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await remove(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Suppression impossible");
    }
  }

  async function handleTogglePublish(l: Leader) {
    const action = l.is_published ? "Dépublier" : "Publier";
    const ok = await confirm({
      title: `${action} la fiche de ${l.first_name} ${l.last_name} ?`,
      variant: l.is_published ? "danger" : "default",
      confirmLabel: action,
    });
    if (!ok) return;
    try {
      await edit(l.id, { is_published: !l.is_published });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Opération impossible");
    }
  }

  async function handlePhotoChange(l: Leader, file: File | null) {
    if (!file) return;
    setUploadingId(l.id);
    try {
      await uploadPhoto(l.id, file);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Envoi de la photo impossible");
    } finally {
      setUploadingId(null);
      const input = photoInputs.current[l.id];
      if (input) input.value = "";
    }
  }

  if (loading) return <p className={adminStyles.stateMsg}>Chargement…</p>;

  return (
    <div className={adminStyles.rbacWrapper}>
      {error && <p className={adminStyles.errorMsg} role="alert">{error}</p>}

      <div className={adminStyles.kpiGrid}>
        <KpiCard color="emerald" icon={<IconCheckCircle />} value={publishedCount} label="Publiés" />
        <KpiCard color="rose" icon={<IconXCircle />} value={draftCount} label="Brouillons" />
      </div>

      {/* ── Modale : créer / modifier ── */}
      {canManage && showModal && (
        <div className={styles.modalOverlay} onClick={cancelEdit}>
          <div className={styles.formCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formHeader}>
              <div className={styles.formHeaderIcon}>{isEditing ? "✏️" : "🧑‍💼"}</div>
              <div>
                <p className={styles.formHeaderTitle}>
                  {isEditing ? "Modifier le membre" : "Ajouter un membre du leadership"}
                </p>
                <p className={styles.formHeaderSub}>
                  {isEditing
                    ? "Modifiez les informations ci-dessous puis enregistrez."
                    : "Remplissez les informations du nouveau membre du leadership."}
                </p>
              </div>
              <button type="button" className={styles.formHeaderClose} onClick={cancelEdit} aria-label="Fermer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.formBody}>
              <div className={styles.grid2}>
                <div className={styles.sectionDivider}>
                  <p className={styles.sectionLabel}>Identité</p>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    Prénom <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    required
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    Nom <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    required
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  />
                </div>

                <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>
                    Titre <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    placeholder="ex. : Pasteur Principal"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Rôle</label>
                  <select
                    className={styles.select}
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="" disabled>Sélectionner…</option>
                    {roleValues.map((r) => (
                      <option key={r.id} value={r.label}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>District</label>
                  <select
                    className={styles.select}
                    value={form.district ?? ""}
                    onChange={(e) => setForm({ ...form, district: e.target.value || null })}
                  >
                    <option value="">Aucun district</option>
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.sectionDivider}>
                  <p className={styles.sectionLabel}>Affectation et service</p>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Église de rattachement</label>
                  <select
                    className={styles.select}
                    value={form.church_id ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, church_id: e.target.value ? Number(e.target.value) : null })
                    }
                  >
                    <option value="">Aucune (niveau national)</option>
                    {churches.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Années de service</label>
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    value={form.years_of_service ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        years_of_service: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>

                <div className={styles.sectionDivider}>
                  <p className={styles.sectionLabel}>Coordonnées et biographie</p>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Courriel (public)</label>
                  <input
                    className={styles.input}
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Téléphone (public)</label>
                  <input
                    className={styles.input}
                    type="tel"
                    value={form.phone ?? ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Biographie</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Courte biographie publique (optionnel)"
                    value={form.bio ?? ""}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  />
                </div>
              </div>

              {formError && (
                <div className={styles.errorBanner} role="alert">
                  <span className={styles.errorBannerIcon}>⚠</span>
                  <span>{formError}</span>
                </div>
              )}

              <div className={styles.formActions}>
                <button type="button" className={styles.btnGhost} onClick={cancelEdit} disabled={saving}>
                  Annuler
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving
                    ? "Enregistrement…"
                    : isEditing
                    ? "✓ Enregistrer les modifications"
                    : "+ Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Liste ── */}
      <div className={styles.listCard}>
        <div className={styles.listHeader}>
          {canManage && (
            <button type="button" className={styles.btnPrimary} onClick={openCreate}>
              + Ajouter un membre
            </button>
          )}
          <p className={styles.listTitle}>
            Corps de leadership
            <span className={styles.listCount}>{leaders.length}</span>
          </p>
        </div>

        <div className={styles.filterRow}>
          <input
            className={styles.filterInput}
            placeholder="Rechercher (nom, titre)…"
            value={filterQ}
            onChange={(e) => { setFilterQ(e.target.value); applyFilters({ q: e.target.value }); }}
          />
          <select
            className={styles.filterSelect}
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); applyFilters({ role: e.target.value }); }}
          >
            <option value="">Tous les rôles</option>
            {roleValues.map((r) => (
              <option key={r.id} value={r.label}>{r.label}</option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={filterDistrict}
            onChange={(e) => { setFilterDistrict(e.target.value); applyFilters({ district: e.target.value }); }}
          >
            <option value="">Tous les districts</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={filterPublished}
            onChange={(e) => { setFilterPublished(e.target.value); applyFilters({ is_published: e.target.value }); }}
          >
            <option value="">Tous statuts</option>
            <option value="true">Publié</option>
            <option value="false">Brouillon</option>
          </select>
        </div>

        {leaders.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyIcon}>🧑‍💼</p>
            <p className={styles.emptyText}>Aucun membre du leadership trouvé.</p>
          </div>
        ) : (
          <div className={styles.leaderGrid}>
            {leaders.map((l) => (
              <div
                key={l.id}
                className={`${styles.leaderCard} ${editingId === l.id ? styles.leaderCardEditing : ""} ${!l.is_published ? styles.leaderCardInactive : ""}`}
              >
                <div className={styles.leaderCardBody}>
                  <div className={styles.photoWrap}>
                    {l.photo_url ? (
                      <img className={styles.photo} src={l.photo_url} alt={`${l.first_name} ${l.last_name}`} />
                    ) : (
                      <span className={styles.photoPlaceholder}>{initials(l)}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.leaderCardTop}>
                      <p className={styles.leaderCardName}>{l.first_name} {l.last_name}</p>
                      {l.is_published
                        ? <span className={styles.badgePublished}>Publié</span>
                        : <span className={styles.badgeInactive}>Brouillon</span>}
                    </div>
                    <p className={styles.leaderCardTitle}>{l.role} · {l.title}</p>
                    <div className={styles.leaderMeta}>
                      {l.district && (
                        <div className={styles.leaderMetaRow}>
                          <span className={styles.metaIcon}>📍</span>
                          <span className={styles.metaText}>{l.district}</span>
                        </div>
                      )}
                      {l.church_id && (
                        <div className={styles.leaderMetaRow}>
                          <span className={styles.metaIcon}>⛪</span>
                          <span className={styles.metaText}>{churchLabel(l.church_id)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {canManage && (
                  <div className={styles.leaderCardFooter}>
                    <button className={styles.btnCardEdit} onClick={() => startEdit(l)}>
                      ✏ Modifier
                    </button>
                    <button
                      className={styles.btnCardPhoto}
                      onClick={() => photoInputs.current[l.id]?.click()}
                      disabled={uploadingId === l.id}
                    >
                      {uploadingId === l.id ? "Envoi…" : "📷 Photo"}
                    </button>
                    <input
                      ref={(el) => { photoInputs.current[l.id] = el; }}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handlePhotoChange(l, e.target.files?.[0] ?? null)}
                    />
                    <button
                      className={l.is_published ? styles.btnCardDeactivate : styles.btnCardActivate}
                      onClick={() => handleTogglePublish(l)}
                    >
                      {l.is_published ? "⏸ Dépublier" : "▶ Publier"}
                    </button>
                    <button className={styles.btnCardDelete} onClick={() => handleDelete(l.id, `${l.first_name} ${l.last_name}`)}>
                      🗑 Supprimer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {dialog}
    </div>
  );
}
