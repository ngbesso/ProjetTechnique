import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useChurches } from "../../hooks/useChurches";
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
  is_published: false,
};

/** Convertit une valeur <input type="datetime-local"> (heure locale, sans fuseau) en ISO UTC pour l'API. */
function toIso(localValue: string): string | undefined {
  if (!localValue) return undefined;
  return new Date(localValue).toISOString();
}

/** Convertit une date ISO (venant de l'API) en valeur affichable dans un <input type="datetime-local">. */
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
    is_published: e.is_published,
  };
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

  const canManage =
    user?.permissions.includes("*") || user?.permissions.includes("event:manage");

  const [form, setForm] = useState<EventInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editForm, setEditForm] = useState<EventInput>(EMPTY);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

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
    if (churchId === null) return "—";
    return churches.find((c) => c.id === churchId)?.name ?? `#${churchId}`;
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
      await add({
        ...form,
        title: form.title.trim(),
        date_start: toIso(form.date_start)!,
        date_end: toIso(form.date_end ?? "") ?? null,
        description: form.description || undefined,
        location: form.location || undefined,
      });
      setForm(EMPTY);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish(event: EventItem) {
    try {
      await edit(event.id, { is_published: !event.is_published });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Mise à jour impossible");
    }
  }

  async function handleDelete(id: number, title: string) {
    if (!confirm(`Supprimer l'événement « ${title} » ?`)) return;
    try {
      await remove(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Suppression impossible");
    }
  }

  function openEdit(e: EventItem) {
    setEditingEvent(e);
    setEditForm(eventToForm(e));
    setEditError("");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvent) return;
    if (!editForm.title.trim() || !editForm.date_start) {
      setEditError("Titre et date de début sont requis.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      await edit(editingEvent.id, {
        ...editForm,
        title: editForm.title.trim(),
        date_start: toIso(editForm.date_start),
        date_end: toIso(editForm.date_end ?? "") ?? null,
        description: editForm.description || undefined,
        location: editForm.location || undefined,
      });
      setEditingEvent(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setEditSaving(false);
    }
  }

  function openParticipants(e: EventItem) {
    setParticipantsEvent(e);
    loadParticipants(e.id);
  }

  if (loading) return <p className={styles.stateMsg}>Chargement…</p>;

  return (
    <div className={styles.rbacWrapper}>
      {error && (
        <p className={styles.errorMsg} role="alert">
          {error}
        </p>
      )}

      {canManage && (
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Créer un événement</h3>
          <form onSubmit={handleSubmit} className={styles.formGrid}>
            <input
              className={styles.input}
              placeholder="Titre *"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              className={styles.input}
              type="datetime-local"
              required
              value={form.date_start}
              onChange={(e) => setForm({ ...form, date_start: e.target.value })}
            />
            <input
              className={styles.input}
              type="datetime-local"
              placeholder="Date de fin (optionnel)"
              value={form.date_end ?? ""}
              onChange={(e) => setForm({ ...form, date_end: e.target.value })}
            />
            <input
              className={styles.input}
              placeholder="Lieu (optionnel)"
              value={form.location ?? ""}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <select
              className={styles.select}
              value={form.church_id ?? ""}
              onChange={(e) =>
                setForm({ ...form, church_id: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">Toute la mission (aucune église)</option>
              {churches.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
            <input
              className={styles.input}
              type="number"
              min={1}
              placeholder="Places max (vide = illimité)"
              value={form.max_participants ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  max_participants: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
              <input
                type="checkbox"
                checked={form.is_published ?? false}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              />
              Publier immédiatement
            </label>
            <textarea
              className={styles.input}
              placeholder="Description (optionnel)"
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Création…" : "+ Ajouter"}
            </button>
          </form>
          {formError && (
            <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>
              {formError}
            </p>
          )}
        </section>
      )}

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Événements ({events.length})</h3>

        <div className={styles.inlineForm} style={{ flexWrap: "wrap", marginBottom: "1rem", gap: "0.5rem" }}>
          <input
            className={styles.input}
            placeholder="Rechercher…"
            value={filterQ}
            style={{ flex: "1 1 160px" }}
            onChange={(e) => { setFilterQ(e.target.value); applyFilters({ q: e.target.value }); }}
          />
          <select
            className={styles.select}
            value={filterPublished}
            onChange={(e) => { setFilterPublished(e.target.value); applyFilters({ is_published: e.target.value }); }}
          >
            <option value="">Tous statuts</option>
            <option value="true">Publié</option>
            <option value="false">Brouillon</option>
          </select>
          <select
            className={styles.select}
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
          <p className={styles.empty}>Aucun événement enregistré.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Titre</th>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Église / District</th>
                <th className={styles.th}>Places</th>
                <th className={styles.th}>Statut</th>
                {canManage && <th className={styles.th}></th>}
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td className={styles.td}>
                    <strong>{e.title}</strong>
                  </td>
                  <td className={styles.td}>
                    {new Date(e.date_start).toLocaleString("fr-CA", {
                      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className={styles.td}>
                    {churchLabel(e.church_id)}
                    {e.district ? ` · ${e.district}` : ""}
                  </td>
                  <td className={styles.td}>
                    {e.max_participants !== null
                      ? `${e.registered_count} / ${e.max_participants}`
                      : `${e.registered_count} (illimité)`}
                  </td>
                  <td className={styles.td}>
                    {canManage ? (
                      <button
                        className={styles.btnOutlineSm}
                        onClick={() => handleTogglePublish(e)}
                      >
                        {e.is_published ? "Publié" : "Brouillon"}
                      </button>
                    ) : (
                      e.is_published ? "Publié" : "Brouillon"
                    )}
                  </td>
                  {canManage && (
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        <button className={styles.btnOutlineSm} onClick={() => openParticipants(e)}>
                          Participants
                        </button>
                        <button className={styles.btnOutlineSm} onClick={() => openEdit(e)}>
                          Modifier
                        </button>
                        <button className={styles.btnDanger} onClick={() => handleDelete(e.id, e.title)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Modale : modifier ── */}
      {editingEvent && (
        <div className={styles.modalOverlay} onClick={() => setEditingEvent(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalName}>Modifier l'événement</h2>
              </div>
              <button className={styles.modalClose} onClick={() => setEditingEvent(null)} aria-label="Fermer">
                ✕
              </button>
            </div>

            <form id="editEventForm" onSubmit={handleEditSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <input
                    className={styles.input}
                    placeholder="Titre *"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    type="datetime-local"
                    required
                    value={editForm.date_start}
                    onChange={(e) => setEditForm({ ...editForm, date_start: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    type="datetime-local"
                    value={editForm.date_end ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, date_end: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    placeholder="Lieu (optionnel)"
                    value={editForm.location ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  />
                  <select
                    className={styles.select}
                    value={editForm.church_id ?? ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        church_id: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  >
                    <option value="">Toute la mission (aucune église)</option>
                    {churches.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <select
                    className={styles.select}
                    value={editForm.district ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, district: (e.target.value || null) as District | null })}
                  >
                    <option value="">Aucun district</option>
                    {districtValues.map((d) => (
                      <option key={d.id} value={d.label}>{d.label}</option>
                    ))}
                  </select>
                  <input
                    className={styles.input}
                    type="number"
                    min={1}
                    placeholder="Places max (vide = illimité)"
                    value={editForm.max_participants ?? ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        max_participants: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
                    <input
                      type="checkbox"
                      checked={editForm.is_published ?? false}
                      onChange={(e) => setEditForm({ ...editForm, is_published: e.target.checked })}
                    />
                    Publié
                  </label>
                  <textarea
                    className={styles.input}
                    placeholder="Description (optionnel)"
                    rows={3}
                    value={editForm.description ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>
                {editError && (
                  <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>
                    {editError}
                  </p>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => setEditingEvent(null)}
                  disabled={editSaving}
                >
                  Annuler
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={editSaving}>
                  {editSaving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale : participants ── */}
      {participantsEvent && (
        <div className={styles.modalOverlay} onClick={() => setParticipantsEvent(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalName}>Participants — {participantsEvent.title}</h2>
              </div>
              <button className={styles.modalClose} onClick={() => setParticipantsEvent(null)} aria-label="Fermer">
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {participantsLoading ? (
                <p className={styles.stateMsg}>Chargement…</p>
              ) : participants.length === 0 ? (
                <p className={styles.empty}>Aucune inscription pour le moment.</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Nom</th>
                      <th className={styles.th}>Courriel</th>
                      <th className={styles.th}>Inscrit le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => (
                      <tr key={p.id}>
                        <td className={styles.td}>{p.member_name ?? "—"}</td>
                        <td className={styles.td}>{p.member_email ?? "—"}</td>
                        <td className={styles.td}>
                          {new Date(p.registered_at).toLocaleDateString("fr-CA")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
