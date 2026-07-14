import { useEffect, useState } from "react";
import adminStyles from "./AdminPage.module.css";
import styles from "./EvenementsPanel.module.css";
import { useAuth } from "../../context/AuthContext";
import { useChurches } from "../../hooks/useChurches";
import { useConfirm } from "../../hooks/useConfirm";
import { useEvents } from "../../hooks/useEvents";
import { useParameters } from "../../hooks/useParameters";
import type { District, EventInput, EventItem } from "../../types";

const EMPTY: EventInput = {
  title: "",
  description: "",
  date_start: "",
  date_end: "",
  location: "",
  church_id: null,
  district: null,
  max_participants: null,
};

/** Convertit une valeur <input type="datetime-local"> (heure locale) en ISO UTC pour l'API. */
function toIso(localValue: string): string | undefined {
  if (!localValue) return undefined;
  return new Date(localValue).toISOString();
}

/** Convertit une date ISO (API) en valeur affichable dans un <input type="datetime-local">. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function eventToForm(e: EventItem): EventInput {
  return {
    title: e.title,
    description: e.description ?? "",
    date_start: toLocalInput(e.date_start),
    date_end: toLocalInput(e.date_end),
    location: e.location ?? "",
    church_id: e.church_id,
    district: e.district,
    max_participants: e.max_participants,
  };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-CA", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function EvenementsPanel() {
  const { user } = useAuth();
  const {
    events,
    loading,
    error,
    loadAdmin,
    add,
    edit,
    remove,
    participants,
    participantsLoading,
    loadParticipants,
  } = useEvents();
  const { churches, load: loadChurches } = useChurches();
  const { values: districtValues, load: loadDistricts } = useParameters("district");
  const { confirm, dialog } = useConfirm();

  const canManage =
    user?.permissions.includes("*") || user?.permissions.includes("event:manage");

  const [form, setForm] = useState<EventInput>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const isEditing = editingId !== null;

  const [participantsEvent, setParticipantsEvent] = useState<EventItem | null>(null);

  const [filterQ, setFilterQ] = useState("");
  const [filterPublished, setFilterPublished] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");

  useEffect(() => {
    loadAdmin();
    loadChurches();
    loadDistricts();
  }, [loadAdmin, loadChurches, loadDistricts]);

  function applyFilters(overrides?: { q?: string; is_published?: string; district?: string }) {
    const q = overrides?.q ?? filterQ;
    const publishedStr = overrides?.is_published ?? filterPublished;
    const district = overrides?.district ?? filterDistrict;
    loadAdmin({
      q: q.trim() || undefined,
      is_published: publishedStr === "" ? undefined : publishedStr === "true",
      district: district || undefined,
    });
  }

  function churchLabel(churchId: number | null): string {
    if (churchId === null) return "Toute la mission";
    return churches.find((c) => c.id === churchId)?.name ?? `#${churchId}`;
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError("");
    setShowModal(true);
  }

  function startEdit(e: EventItem) {
    setEditingId(e.id);
    setForm(eventToForm(e));
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
    if (!form.title.trim() || !form.date_start) {
      setFormError("Titre et date de début sont requis.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        date_start: toIso(form.date_start)!,
        date_end: toIso(form.date_end ?? "") ?? null,
        description: form.description || undefined,
        location: form.location || undefined,
      };
      if (editingId !== null) {
        await edit(editingId, payload);
      } else {
        await add({ ...payload, is_published: false });
      }
      cancelEdit();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, title: string) {
    const ok = await confirm({
      title: `Supprimer l'événement « ${title} » ?`,
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

  async function handleTogglePublish(e: EventItem) {
    const action = e.is_published ? "Dépublier" : "Publier";
    const ok = await confirm({
      title: `${action} l'événement « ${e.title} » ?`,
      description: e.is_published
        ? "L'événement ne sera plus visible publiquement."
        : "L'événement devient visible et ouvert aux inscriptions.",
      variant: e.is_published ? "danger" : "default",
      confirmLabel: action,
    });
    if (!ok) return;
    try {
      await edit(e.id, { is_published: !e.is_published });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Opération impossible");
    }
  }

  function openParticipants(e: EventItem) {
    setParticipantsEvent(e);
    loadParticipants(e.id);
  }

  if (loading) return <p className={adminStyles.stateMsg}>Chargement…</p>;

  return (
    <div className={adminStyles.rbacWrapper}>
      {error && <p className={adminStyles.errorMsg} role="alert">{error}</p>}

      {/* ── Modale : créer / modifier ── */}
      {canManage && showModal && (
        <div className={styles.modalOverlay} onClick={cancelEdit}>
          <div className={styles.formCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formHeader}>
              <div className={styles.formHeaderIcon}>{isEditing ? "✏️" : "📅"}</div>
              <div>
                <p className={styles.formHeaderTitle}>
                  {isEditing ? "Modifier l'événement" : "Créer un événement"}
                </p>
                <p className={styles.formHeaderSub}>
                  {isEditing
                    ? "Modifiez les informations ci-dessous puis enregistrez."
                    : "Remplissez les informations du nouvel événement (créé en brouillon)."}
                </p>
              </div>
              <button type="button" className={styles.formHeaderClose} onClick={cancelEdit} aria-label="Fermer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.formBody}>
              <div className={styles.grid2}>
                <div className={styles.sectionDivider}>
                  <p className={styles.sectionLabel}>Informations générales</p>
                </div>

                <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>
                    Titre <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    placeholder="ex. : Camp de jeunes d'été"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    Date de début <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    type="datetime-local"
                    required
                    value={form.date_start}
                    onChange={(e) => setForm({ ...form, date_start: e.target.value })}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Date de fin</label>
                  <input
                    className={styles.input}
                    type="datetime-local"
                    value={form.date_end ?? ""}
                    onChange={(e) => setForm({ ...form, date_end: e.target.value })}
                  />
                </div>

                <div className={styles.sectionDivider}>
                  <p className={styles.sectionLabel}>Lieu et organisation</p>
                </div>

                <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Lieu</label>
                  <input
                    className={styles.input}
                    placeholder="ex. : Centre de plein air, Sainte-Adèle"
                    value={form.location ?? ""}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Église organisatrice</label>
                  <select
                    className={styles.select}
                    value={form.church_id ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, church_id: e.target.value ? Number(e.target.value) : null })
                    }
                  >
                    <option value="">Toute la mission</option>
                    {churches.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>District</label>
                  <select
                    className={styles.select}
                    value={form.district ?? ""}
                    onChange={(e) => setForm({ ...form, district: (e.target.value || null) as District | null })}
                  >
                    <option value="">Aucun district</option>
                    {districtValues.map((d) => (
                      <option key={d.id} value={d.label}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.sectionDivider}>
                  <p className={styles.sectionLabel}>Capacité et description</p>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Places maximum</label>
                  <input
                    className={styles.input}
                    type="number"
                    min={1}
                    placeholder="Vide = illimité"
                    value={form.max_participants ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        max_participants: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>

                <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Description</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Description de l'événement (optionnel)"
                    value={form.description ?? ""}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                    : "+ Créer l'événement"}
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
              + Créer un événement
            </button>
          )}
          <p className={styles.listTitle}>
            Événements
            <span className={styles.listCount}>{events.length}</span>
          </p>
        </div>

        <div className={styles.filterRow}>
          <input
            className={styles.filterInput}
            placeholder="Rechercher (titre, lieu)…"
            value={filterQ}
            onChange={(e) => { setFilterQ(e.target.value); applyFilters({ q: e.target.value }); }}
          />
          <select
            className={styles.filterSelect}
            value={filterPublished}
            onChange={(e) => { setFilterPublished(e.target.value); applyFilters({ is_published: e.target.value }); }}
          >
            <option value="">Tous statuts</option>
            <option value="true">Publié</option>
            <option value="false">Brouillon</option>
          </select>
          <select
            className={styles.filterSelect}
            value={filterDistrict}
            onChange={(e) => { setFilterDistrict(e.target.value); applyFilters({ district: e.target.value }); }}
          >
            <option value="">Tous les districts</option>
            {districtValues.map((d) => (
              <option key={d.id} value={d.label}>{d.label}</option>
            ))}
          </select>
        </div>

        {events.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyIcon}>📅</p>
            <p className={styles.emptyText}>Aucun événement trouvé.</p>
          </div>
        ) : (
          <div className={styles.eventGrid}>
            {events.map((e) => (
              <div
                key={e.id}
                className={`${styles.eventCard} ${editingId === e.id ? styles.eventCardEditing : ""} ${!e.is_published ? styles.eventCardInactive : ""}`}
              >
                <div className={`${styles.eventCardBand} ${e.is_published ? styles.eventCardBandPublished : ""}`} />
                <div className={styles.eventCardBody}>
                  <div className={styles.eventCardTop}>
                    <p className={styles.eventCardName}>{e.title}</p>
                    {e.is_published
                      ? <span className={styles.badgePublished}>Publié</span>
                      : <span className={styles.badgeDraft}>Brouillon</span>}
                  </div>
                  <div className={styles.eventMeta}>
                    <div className={styles.eventMetaRow}>
                      <span className={styles.metaIcon}>🗓️</span>
                      <span className={styles.metaText}>{formatDateTime(e.date_start)}</span>
                    </div>
                    {e.location && (
                      <div className={styles.eventMetaRow}>
                        <span className={styles.metaIcon}>📍</span>
                        <span className={styles.metaText}>{e.location}</span>
                      </div>
                    )}
                    <div className={styles.eventMetaRow}>
                      <span className={styles.metaIcon}>⛪</span>
                      <span className={styles.metaText}>
                        {churchLabel(e.church_id)}{e.district ? ` · ${e.district}` : ""}
                      </span>
                    </div>
                    <div className={styles.eventMetaRow}>
                      <span className={styles.metaIcon}>👥</span>
                      <span className={styles.metaText}>
                        {e.max_participants !== null
                          ? `${e.registered_count} / ${e.max_participants} inscrits`
                          : `${e.registered_count} inscrit(s) · illimité`}
                      </span>
                    </div>
                  </div>
                </div>
                {canManage && (
                  <div className={styles.eventCardFooter}>
                    <button className={styles.btnCardEdit} onClick={() => startEdit(e)}>
                      ✏ Modifier
                    </button>
                    <button
                      className={e.is_published ? styles.btnCardDeactivate : styles.btnCardActivate}
                      onClick={() => handleTogglePublish(e)}
                    >
                      {e.is_published ? "⏸ Dépublier" : "▶ Publier"}
                    </button>
                    <button className={styles.btnCardParticipants} onClick={() => openParticipants(e)}>
                      👥 Participants
                    </button>
                    <button className={styles.btnCardDelete} onClick={() => handleDelete(e.id, e.title)}>
                      🗑 Supprimer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modale : participants ── */}
      {participantsEvent && (
        <div className={styles.modalOverlay} onClick={() => setParticipantsEvent(null)}>
          <div className={styles.participantsCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formHeader}>
              <div className={styles.formHeaderIcon}>👥</div>
              <div>
                <p className={styles.formHeaderTitle}>Participants</p>
                <p className={styles.formHeaderSub}>{participantsEvent.title}</p>
              </div>
              <button
                type="button"
                className={styles.formHeaderClose}
                onClick={() => setParticipantsEvent(null)}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <div className={styles.participantsBody}>
              {participantsLoading ? (
                <p className={adminStyles.stateMsg}>Chargement…</p>
              ) : participants.length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyIcon}>👥</p>
                  <p className={styles.emptyText}>Aucune inscription pour le moment.</p>
                </div>
              ) : (
                participants.map((p) => (
                  <div key={p.id} className={styles.participantRow}>
                    <span className={styles.participantName}>{p.member_name ?? "—"}</span>
                    <span className={styles.participantMeta}>
                      {p.member_email ?? "—"} · inscrit le{" "}
                      {new Date(p.registered_at).toLocaleDateString("fr-CA")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {dialog}
    </div>
  );
}
