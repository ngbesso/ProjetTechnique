import { useEffect, useRef, useState } from "react";
import styles from "./AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useSermons } from "../../hooks/useSermons";
import type { SermonInput, SermonStatus } from "../../types";

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

export function SermonsPanel() {
  const { user } = useAuth();
  const { sermons, loading, error, loadAdmin, add, edit, remove } = useSermons();
  const [form, setForm] = useState<SermonInput>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManage =
    user?.permissions.includes("*") || user?.permissions.includes("sermon:manage");

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

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
    if (!confirm(`Supprimer le sermon « ${title} » ?`)) return;
    try {
      await remove(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Suppression impossible");
    }
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
          <h3 className={styles.cardTitle}>Ajouter un sermon</h3>
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
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Envoi en cours…" : "+ Ajouter"}
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
        <h3 className={styles.cardTitle}>Sermons ({sermons.length})</h3>
        {sermons.length === 0 ? (
          <p className={styles.empty}>Aucun sermon enregistré.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Titre</th>
                <th className={styles.th}>Prédicateur</th>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Format</th>
                <th className={styles.th}>Statut</th>
                {canManage && <th className={styles.th}></th>}
              </tr>
            </thead>
            <tbody>
              {sermons.map((s) => (
                <tr key={s.id}>
                  <td className={styles.td}>
                    <strong>{s.title}</strong>
                  </td>
                  <td className={styles.td}>{s.preacher}</td>
                  <td className={styles.td}>{s.sermon_date}</td>
                  <td className={styles.td}>{s.format === "video" ? "Vidéo" : "Audio"}</td>
                  <td className={styles.td}>
                    {canManage ? (
                      <select
                        className={styles.select}
                        value={s.status}
                        onChange={(e) =>
                          handleStatusChange(s.id, e.target.value as SermonStatus)
                        }
                      >
                        {(Object.keys(STATUS_LABELS) as SermonStatus[]).map((st) => (
                          <option key={st} value={st}>
                            {STATUS_LABELS[st]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      STATUS_LABELS[s.status]
                    )}
                  </td>
                  {canManage && (
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        <button
                          className={styles.btnDanger}
                          onClick={() => handleDelete(s.id, s.title)}
                        >
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
    </div>
  );
}
