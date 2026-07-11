import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { useFormations } from "../../hooks/useFormations";
import { useConfirm } from "../../hooks/useConfirm";
import { DataTable, createColumnHelper } from "../../components/ui/DataTable";
import type { Formation, FormationInput, FormationStatus } from "../../types";

const EMPTY: FormationInput = {
  title: "",
  instructor: "",
  formation_date: "",
  price: 0,
  capacity: 20,
  description: "",
  status: "draft",
};

const STATUS_LABELS: Record<FormationStatus, string> = {
  draft: "Brouillon",
  published: "Publiée",
  archived: "Archivée",
};

const TODAY = new Date().toISOString().split("T")[0];

function formatPrice(price: number): string {
  return price === 0
    ? "Gratuit"
    : price.toLocaleString("fr-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 2,
      });
}

const col = createColumnHelper<Formation>();

export function FormationsPanel() {
  const { user } = useAuth();
  const { formations, loading, error, loadAdmin, add, edit, remove } = useFormations();
  const { confirm, dialog } = useConfirm();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<FormationInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [editingFormation, setEditingFormation] = useState<Formation | null>(null);
  const [editForm, setEditForm] = useState<FormationInput>(EMPTY);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const canManage =
    user?.permissions.includes("*") || user?.permissions.includes("formation:manage");

  const [filterQ, setFilterQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  function applyAdminFilters(overrides?: Record<string, string>) {
    const q = overrides?.q ?? filterQ;
    const status = overrides?.status ?? filterStatus;
    loadAdmin({
      q: q.trim() || undefined,
      status: status || undefined,
    });
  }

  function openCreateModal() {
    setForm(EMPTY);
    setFormError("");
    setShowCreateModal(true);
  }

  function validate(f: FormationInput, checkDate: boolean): string | null {
    if (!f.title.trim() || !f.instructor.trim() || !f.formation_date) {
      return "Titre, formateur et date sont requis.";
    }
    if (checkDate && f.formation_date < TODAY) {
      return "La date de la formation doit être une date à venir.";
    }
    if (f.price < 0) return "Le prix ne peut pas être négatif.";
    if (!Number.isInteger(f.capacity) || f.capacity < 1) {
      return "Le nombre de places doit être un entier d'au moins 1.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(form, true);
    if (err) {
      setFormError(err);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await add({ ...form, description: form.description || undefined });
      setForm(EMPTY);
      setShowCreateModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: number, status: FormationStatus) {
    try {
      await edit(id, { status });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Mise à jour impossible");
    }
  }

  async function handleDelete(id: number, title: string) {
    const ok = await confirm({
      title: `Supprimer la formation « ${title} » ?`,
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

  function openEdit(f: Formation) {
    setEditingFormation(f);
    setEditForm({
      title: f.title,
      instructor: f.instructor,
      formation_date: f.formation_date,
      price: f.price,
      capacity: f.capacity,
      description: f.description ?? "",
      status: f.status,
    });
    setEditError("");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingFormation) return;
    const dateChanged = editForm.formation_date !== editingFormation.formation_date;
    const err = validate(editForm, dateChanged);
    if (err) {
      setEditError(err);
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      // La date n'est envoyée que si elle a changé : une formation passée
      // reste modifiable (prix, statut…) sans déclencher la validation de date.
      const payload: Partial<FormationInput> = {
        title: editForm.title,
        instructor: editForm.instructor,
        price: editForm.price,
        capacity: editForm.capacity,
        status: editForm.status,
        description: editForm.description || undefined,
      };
      if (dateChanged) payload.formation_date = editForm.formation_date;
      await edit(editingFormation.id, payload);
      setEditingFormation(null);
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
    col.accessor("instructor", { header: "Formateur" }),
    col.accessor("formation_date", { header: "Date" }),
    col.accessor("price", {
      header: "Prix",
      cell: (info) => formatPrice(info.getValue()),
    }),
    col.accessor("capacity", {
      header: "Inscrits",
      cell: (info) => {
        const f = info.row.original;
        const full = f.registered_count >= f.capacity;
        return (
          <span style={full ? { color: "var(--color-danger, #dc2626)", fontWeight: 600 } : undefined}>
            {f.registered_count}/{f.capacity}
          </span>
        );
      },
    }),
    col.accessor("status", {
      header: "Statut",
      cell: (info) => {
        const f = info.row.original;
        return canManage ? (
          <select
            className={styles.select}
            value={f.status}
            onChange={(e) => handleStatusChange(f.id, e.target.value as FormationStatus)}
          >
            {(Object.keys(STATUS_LABELS) as FormationStatus[]).map((st) => (
              <option key={st} value={st}>{STATUS_LABELS[st]}</option>
            ))}
          </select>
        ) : STATUS_LABELS[f.status];
      },
    }),
    ...(canManage
      ? [
          col.display({
            id: "actions",
            header: "",
            cell: (info) => {
              const f = info.row.original;
              return (
                <div className={styles.actions}>
                  <button className={styles.btnOutlineSm} onClick={() => openEdit(f)}>Modifier</button>
                  <button className={styles.btnDanger} onClick={() => handleDelete(f.id, f.title)}>Supprimer</button>
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
              + Ajouter une formation
            </button>
          )}
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>Formations ({formations.length})</h3>
        </div>

        <div className={styles.filterBar}>
          <input
            className={styles.input}
            placeholder="Rechercher (titre, formateur)…"
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
            {(Object.keys(STATUS_LABELS) as FormationStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className={styles.listBody}>
          <DataTable
            columns={columns}
            data={formations}
            getRowId={(f) => f.id}
            emptyMessage="Aucune formation enregistrée."
          />
        </div>
      </section>

      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderIcon}>🎓</div>
              <div className={styles.modalHeaderText}>
                <h2 className={styles.modalName}>Ajouter une formation</h2>
                <span className={styles.modalSubtitle}>Remplissez les informations de la nouvelle formation.</span>
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
                    placeholder="Titre de la formation *"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    placeholder="Formateur / animateur *"
                    required
                    value={form.instructor}
                    onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                  />
                  <div>
                    <label className={styles.fieldLabel}>Date de la formation *</label>
                    <input
                      className={styles.input}
                      type="date"
                      required
                      min={TODAY}
                      value={form.formation_date}
                      onChange={(e) => setForm({ ...form, formation_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Prix (CAD) — 0 = gratuit</label>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Nombre de places *</label>
                    <input
                      className={styles.input}
                      type="number"
                      min={1}
                      step={1}
                      required
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                    />
                  </div>
                  <select
                    className={styles.select}
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as FormationStatus })
                    }
                  >
                    {(Object.keys(STATUS_LABELS) as FormationStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className={styles.input}
                    placeholder="Description (optionnel)"
                    rows={3}
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
                  {saving ? "Enregistrement…" : "+ Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingFormation && (
        <div className={styles.modalOverlay} onClick={() => setEditingFormation(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderIcon}>✏️</div>
              <div className={styles.modalHeaderText}>
                <h2 className={styles.modalName}>Modifier la formation</h2>
                <span className={styles.modalSubtitle}>
                  {editingFormation.instructor} · {editingFormation.formation_date}
                </span>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => setEditingFormation(null)}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <input
                    className={styles.input}
                    placeholder="Titre de la formation *"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                  <input
                    className={styles.input}
                    placeholder="Formateur / animateur *"
                    required
                    value={editForm.instructor}
                    onChange={(e) => setEditForm({ ...editForm, instructor: e.target.value })}
                  />
                  <div>
                    <label className={styles.fieldLabel}>Date de la formation *</label>
                    <input
                      className={styles.input}
                      type="date"
                      required
                      min={TODAY}
                      value={editForm.formation_date}
                      onChange={(e) => setEditForm({ ...editForm, formation_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Prix (CAD) — 0 = gratuit</label>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Nombre de places *</label>
                    <input
                      className={styles.input}
                      type="number"
                      min={1}
                      step={1}
                      required
                      value={editForm.capacity}
                      onChange={(e) => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                    />
                  </div>
                  <select
                    className={styles.select}
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value as FormationStatus })
                    }
                  >
                    {(Object.keys(STATUS_LABELS) as FormationStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
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
                  onClick={() => setEditingFormation(null)}
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
