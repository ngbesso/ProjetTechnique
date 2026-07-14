import { useEffect, useRef, useState } from "react";
import styles from "./AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useSermons } from "../../hooks/useSermons";
import { useConfirm } from "../../hooks/useConfirm";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import { fetchSermonAdminMediaUrl, fetchSermonSeries } from "../../lib/api/sermons";
import type { Sermon, SermonInput, SermonStatus } from "../../types";

const EMPTY: SermonInput = {
  title: "",
  preacher: "",
  sermon_date: "",
  description: "",
  series: "",
  status: "draft",
};

const STATUS_LABELS: Record<SermonStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

const col = createColumnHelper<Sermon>();

export function SermonsPanel() {
  const { user } = useAuth();
  const { sermons, loading, error, loadAdmin, add, edit, replaceMedia, remove } = useSermons();
  const { confirm, dialog } = useConfirm();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<SermonInput>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [playingSermon, setPlayingSermon] = useState<Sermon | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null);
  const [editForm, setEditForm] = useState<SermonInput>(EMPTY);
  const [editFile, setEditFile] = useState<File | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const canManage =
    user?.permissions.includes("*") || user?.permissions.includes("sermon:manage");

  const [filterQ, setFilterQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSeries, setFilterSeries] = useState("");
  const [filterFormat, setFilterFormat] = useState("");
  const [seriesList, setSeriesList] = useState<string[]>([]);

  useEffect(() => {
    loadAdmin();
    fetchSermonSeries().then(setSeriesList).catch(() => {});
  }, [loadAdmin]);

  function applyAdminFilters(overrides?: Record<string, string>) {
    const q = overrides?.q ?? filterQ;
    const status = overrides?.status ?? filterStatus;
    const series = overrides?.series ?? filterSeries;
    const format = overrides?.format ?? filterFormat;
    loadAdmin({
      q: q.trim() || undefined,
      status: status || undefined,
      series: series || undefined,
      format: format || undefined,
    });
  }

  function openCreateModal() {
    setForm(EMPTY);
    setFile(null);
    setFormError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowCreateModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.preacher.trim() || !form.sermon_date || !file) {
      setFormError("Titre, prédicateur, date et fichier sont requis.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await add(form, file);
      setForm(EMPTY);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowCreateModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: number, status: SermonStatus) {
    try {
      await edit(id, { status });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Mise à jour impossible");
    }
  }

  async function handleDelete(id: number, title: string) {
    const ok = await confirm({
      title: `Supprimer le sermon « ${title} » ?`,
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

  async function openPlayer(s: Sermon) {
    setPlayingSermon(s);
    setMediaUrl(null);
    setMediaLoading(true);
    try {
      const res = await fetchSermonAdminMediaUrl(s.id);
      setMediaUrl(res.url);
    } catch {
      setMediaUrl(null);
    } finally {
      setMediaLoading(false);
    }
  }

  function openEdit(s: Sermon) {
    setEditingSermon(s);
    setEditForm({
      title: s.title,
      preacher: s.preacher,
      sermon_date: s.sermon_date,
      description: s.description ?? "",
      series: s.series ?? "",
      status: s.status,
    });
    setEditFile(null);
    if (editFileRef.current) editFileRef.current.value = "";
    setEditError("");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSermon) return;
    if (!editForm.title.trim() || !editForm.preacher.trim() || !editForm.sermon_date) {
      setEditError("Titre, prédicateur et date sont requis.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      await edit(editingSermon.id, {
        title: editForm.title,
        preacher: editForm.preacher,
        sermon_date: editForm.sermon_date,
        description: editForm.description || undefined,
        series: editForm.series || undefined,
        status: editForm.status,
      });
      if (editFile) {
        await replaceMedia(editingSermon.id, editFile);
      }
      setEditingSermon(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setEditSaving(false);
    }
  }

  const columns = [
    col.accessor("title", {
      header: "Titre",
      cell: (info) => <strong>{info.getValue()}</strong>,
    }),
    col.accessor("preacher", { header: "Prédicateur" }),
    col.accessor("sermon_date", { header: "Date" }),
    col.accessor("format", {
      header: "Format",
      cell: (info) => (info.getValue() === "video" ? "Vidéo" : "Audio"),
    }),
    col.accessor("status", {
      header: "Statut",
      cell: (info) => {
        const s = info.row.original;
        return canManage ? (
          <select
            className={styles.select}
            value={s.status}
            onChange={(e) => handleStatusChange(s.id, e.target.value as SermonStatus)}
          >
            {(Object.keys(STATUS_LABELS) as SermonStatus[]).map((st) => (
              <option key={st} value={st}>{STATUS_LABELS[st]}</option>
            ))}
          </select>
        ) : STATUS_LABELS[s.status];
      },
    }),
    ...(canManage
      ? [
          col.display({
            id: "actions",
            header: "",
            cell: (info) => {
              const s = info.row.original;
              return (
                <div className={styles.actions}>
                  <button className={styles.btnOutlineSm} onClick={() => openPlayer(s)}>Lire</button>
                  <button className={styles.btnOutlineSm} onClick={() => openEdit(s)}>Modifier</button>
                  <button className={styles.btnDanger} onClick={() => handleDelete(s.id, s.title)}>Supprimer</button>
                </div>
              );
            },
          }),
        ]
      : []),
  ];

  if (loading) return <p className={styles.stateMsg}>Chargement…</p>;

  return (
    <div className={styles.rbacWrapper}>
      {error && (
        <p className={styles.errorMsg} role="alert">
          {error}
        </p>
      )}

      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          {canManage && (
            <button type="button" className={styles.btnPrimary} onClick={openCreateModal}>
              + Ajouter un sermon
            </button>
          )}
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>Sermons ({sermons.length})</h3>
        </div>

        <div className={styles.filterBar}>
          <input
            className={styles.input}
            placeholder="Rechercher…"
            value={filterQ}
            style={{ flex: "1 1 160px" }}
            onChange={(e) => { setFilterQ(e.target.value); applyAdminFilters({ q: e.target.value }); }}
          />
          <select
            className={styles.select}
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); applyAdminFilters({ status: e.target.value }); }}
          >
            <option value="">Tous statuts</option>
            {(Object.keys(STATUS_LABELS) as SermonStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={filterSeries}
            onChange={(e) => { setFilterSeries(e.target.value); applyAdminFilters({ series: e.target.value }); }}
          >
            <option value="">Toutes les séries</option>
            {seriesList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={filterFormat}
            onChange={(e) => { setFilterFormat(e.target.value); applyAdminFilters({ format: e.target.value }); }}
          >
            <option value="">Tous formats</option>
            <option value="audio">Audio</option>
            <option value="video">Vidéo</option>
          </select>
        </div>

        <div className={styles.listBody}>
          <DataTable
            columns={columns}
            data={sermons}
            getRowId={(s) => s.id}
            emptyMessage="Aucun sermon enregistré."
          />
        </div>
      </section>

      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderIcon}>🎙</div>
              <div className={styles.modalHeaderText}>
                <h2 className={styles.modalName}>Ajouter un sermon</h2>
                <span className={styles.modalSubtitle}>Remplissez les informations du nouveau sermon.</span>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => setShowCreateModal(false)}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <input
                    className={styles.input}
                    placeholder="Titre *"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    placeholder="Prédicateur *"
                    required
                    value={form.preacher}
                    onChange={(e) => setForm({ ...form, preacher: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    type="date"
                    required
                    value={form.sermon_date}
                    onChange={(e) => setForm({ ...form, sermon_date: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    placeholder="Série (optionnel)"
                    value={form.series ?? ""}
                    onChange={(e) => setForm({ ...form, series: e.target.value })}
                  />
                  <select
                    className={styles.select}
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as SermonStatus })
                    }
                  >
                    {(Object.keys(STATUS_LABELS) as SermonStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <input
                    ref={fileInputRef}
                    className={styles.input}
                    type="file"
                    accept="audio/*,video/*"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <textarea
                    className={styles.input}
                    placeholder="Description (optionnel)"
                    value={form.description ?? ""}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                {formError && (
                  <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>
                    {formError}
                  </p>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => setShowCreateModal(false)}
                  disabled={saving}
                >
                  Annuler
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? "Envoi en cours…" : "+ Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {playingSermon && (
        <div className={styles.modalOverlay} onClick={() => { setPlayingSermon(null); setMediaUrl(null); }}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderIcon}>{playingSermon.format === "video" ? "🎬" : "🎧"}</div>
              <div className={styles.modalHeaderText}>
                <h2 className={styles.modalName}>{playingSermon.title}</h2>
                <span className={styles.modalSubtitle}>
                  {playingSermon.preacher} · {playingSermon.sermon_date}
                </span>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => { setPlayingSermon(null); setMediaUrl(null); }}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {mediaLoading && (
                <p style={{ textAlign: "center", color: "var(--text-muted)" }}>Chargement…</p>
              )}
              {!mediaLoading && mediaUrl && (
                playingSermon.format === "video" ? (
                  <video
                    controls
                    autoPlay
                    style={{ width: "100%", borderRadius: "6px" }}
                    src={mediaUrl}
                  />
                ) : (
                  <audio
                    controls
                    autoPlay
                    style={{ width: "100%" }}
                    src={mediaUrl}
                  />
                )
              )}
              {!mediaLoading && !mediaUrl && (
                <p style={{ textAlign: "center", color: "var(--color-danger)" }}>
                  Impossible de charger le fichier média.
                </p>
              )}
              {playingSermon.description && (
                <p style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  {playingSermon.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {editingSermon && (
        <div className={styles.modalOverlay} onClick={() => setEditingSermon(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderIcon}>✏️</div>
              <div className={styles.modalHeaderText}>
                <h2 className={styles.modalName}>Modifier le sermon</h2>
                <span className={styles.modalSubtitle}>
                  {editingSermon.format === "video" ? "Vidéo" : "Audio"} · {editingSermon.sermon_date}
                </span>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => setEditingSermon(null)}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <form id="editSermonForm" onSubmit={handleEditSubmit}>
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
                    placeholder="Prédicateur *"
                    required
                    value={editForm.preacher}
                    onChange={(e) => setEditForm({ ...editForm, preacher: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    type="date"
                    required
                    value={editForm.sermon_date}
                    onChange={(e) => setEditForm({ ...editForm, sermon_date: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    placeholder="Série (optionnel)"
                    value={editForm.series ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, series: e.target.value })}
                  />
                  <select
                    className={styles.select}
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value as SermonStatus })
                    }
                  >
                    {(Object.keys(STATUS_LABELS) as SermonStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className={styles.input}
                    placeholder="Description (optionnel)"
                    value={editForm.description ?? ""}
                    rows={3}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>
                      Remplacer le fichier média (optionnel)
                    </label>
                    <input
                      ref={editFileRef}
                      className={styles.input}
                      type="file"
                      accept="audio/*,video/*"
                      onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                    />
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                      Actuel : {editingSermon.format === "video" ? "Vidéo" : "Audio"} — laissez vide pour conserver le fichier existant.
                    </p>
                  </div>
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
                  onClick={() => setEditingSermon(null)}
                  disabled={editSaving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={editSaving}
                >
                  {editSaving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dialog}
    </div>
  );
}
