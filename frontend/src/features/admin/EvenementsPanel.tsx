import { useEffect, useState } from "react";
import adminStyles from "./AdminPage.module.css";
import styles from "./EvenementsPanel.module.css";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { useAuth } from "../../context/AuthContext";
import { useChurches } from "../../hooks/useChurches";
import { useConfirm } from "../../hooks/useConfirm";
import { useEvents } from "../../hooks/useEvents";
import { useParameters } from "../../hooks/useParameters";
import { exportEventRegistrations, uploadEventImage } from "../../lib/api/events";
import { EvenementsStatsPanel } from "./EvenementsStatsPanel";
import type { District, EventInput, EventItem, EventStatus } from "../../types";

type StepId = "info" | "date" | "details" | "images" | "review";

const STEPS: { id: StepId; label: string }[] = [
  { id: "info", label: "Informations" },
  { id: "date", label: "Date & Lieu" },
  { id: "details", label: "Détails" },
  { id: "images", label: "Images" },
  { id: "review", label: "Révision" },
];

const EMPTY: EventInput = {
  title: "",
  description: "",
  category: "",
  date_start: "",
  date_end: "",
  location: "",
  instructor: "",
  price: 0,
  church_id: null,
  district: null,
  capacity: null,
  status: "draft",
};

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  cancelled: "Annulé",
  completed: "Terminé",
};

const STATUS_BADGE_CLASS: Record<EventStatus, string> = {
  draft: "badgeDraft",
  published: "badgePublished",
  cancelled: "badgeCancelled",
  completed: "badgeCompleted",
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
    category: e.category,
    date_start: toLocalInput(e.date_start),
    date_end: toLocalInput(e.date_end),
    location: e.location ?? "",
    instructor: e.instructor ?? "",
    price: e.price ?? 0,
    church_id: e.church_id,
    district: e.district,
    capacity: e.capacity,
    status: e.status,
  };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-CA", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatPrice(price: number | null): string {
  return !price ? "Gratuit" : `${price.toFixed(2)} $`;
}

function formatLocalDateTime(localValue: string | null | undefined): string {
  if (!localValue) return "—";
  return new Date(localValue).toLocaleString("fr-CA", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Icônes KPI (même pattern que DashboardPanel) ─────────────────────────────

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconFileEdit() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 18l4-4-1.5-1.5L10.5 16.5V18H12z" />
    </svg>
  );
}

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

interface KpiProps {
  color: "violet" | "amber" | "emerald" | "rose";
  icon: React.ReactNode;
  value: number;
  label: string;
}

function KpiCard({ color, icon, value, label }: KpiProps) {
  return (
    <div className={`${styles.kpiCard} ${styles[color]}`}>
      <div className={`${styles.kpiIcon} ${styles[color]}`}>{icon}</div>
      <div className={styles.kpiBody}>
        <div className={styles.kpiLabel}>{label}</div>
        <div className={styles.kpiValue}>{value}</div>
      </div>
    </div>
  );
}

function StepProgress({ current }: { current: number }) {
  return (
    <div className={styles.stepProgress}>
      {STEPS.map((s, i) => (
        <div key={s.id} className={styles.stepItem}>
          <div className={styles.stepDotCol}>
            <div
              className={`${styles.stepDot} ${i === current ? styles.stepDotActive : ""} ${i < current ? styles.stepDotDone : ""}`}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span className={i === current ? `${styles.stepLabel} ${styles.stepLabelActive}` : styles.stepLabel}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`${styles.stepLine} ${i < current ? styles.stepLineDone : ""}`} />
          )}
        </div>
      ))}
    </div>
  );
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
  const { values: categoryValues, load: loadCategories } = useParameters("event_category");
  const { confirm, dialog } = useConfirm();

  const canManage =
    user?.permissions.includes("*") || user?.permissions.includes("event:manage");

  const [form, setForm] = useState<EventInput>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [step, setStep] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const isEditing = editingId !== null;
  const isLastStep = step === STEPS.length - 1;

  function resetImageState(existingUrl: string | null = null) {
    if (imagePreview && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(existingUrl);
  }

  const [participantsEvent, setParticipantsEvent] = useState<EventItem | null>(null);
  const [exporting, setExporting] = useState(false);
  const [view, setView] = useState<"liste" | "statistiques">("liste");

  const [filterQ, setFilterQ] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | EventStatus>("all");

  useEffect(() => {
    loadAdmin();
    loadChurches();
    loadDistricts();
    loadCategories();
  }, [loadAdmin, loadChurches, loadDistricts, loadCategories]);

  function applyFilters(overrides?: { q?: string; category?: string; district?: string }) {
    const q = overrides?.q ?? filterQ;
    const category = overrides?.category ?? filterCategory;
    const district = overrides?.district ?? filterDistrict;
    loadAdmin({
      q: q.trim() || undefined,
      category: category || undefined,
      district: district || undefined,
    });
  }

  const kpi = {
    total: events.length,
    draft: events.filter((e) => e.status === "draft").length,
    published: events.filter((e) => e.status === "published").length,
    cancelled: events.filter((e) => e.status === "cancelled").length,
  };

  const STATUS_TABS: { id: "all" | EventStatus; label: string }[] = [
    { id: "all", label: "Tous" },
    { id: "draft", label: "Brouillons" },
    { id: "published", label: "Publiés" },
    { id: "cancelled", label: "Annulés" },
    { id: "completed", label: "Terminés" },
  ];

  const visibleEvents = statusTab === "all" ? events : events.filter((e) => e.status === statusTab);

  function churchLabel(churchId: number | null): string {
    if (churchId === null) return "Toute la mission";
    return churches.find((c) => c.id === churchId)?.name ?? `#${churchId}`;
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError("");
    setStep(0);
    resetImageState(null);
    setShowModal(true);
  }

  function startEdit(e: EventItem) {
    setEditingId(e.id);
    setForm(eventToForm(e));
    setFormError("");
    setStep(0);
    resetImageState(e.image_url);
    setShowModal(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError("");
    setStep(0);
    resetImageState(null);
    setShowModal(false);
  }

  function validateStep(currentStep: number): string | null {
    if (currentStep === 0 && !form.title.trim()) return "Le titre est requis.";
    if (currentStep === 0 && !form.category) return "La catégorie est requise.";
    if (currentStep === 1 && !form.date_start) return "La date de début est requise.";
    return null;
  }

  function goPrev() {
    setFormError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const stepError = validateStep(step);
    if (stepError) {
      setFormError(stepError);
      return;
    }
    setFormError("");

    if (!isLastStep) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        date_start: toIso(form.date_start)!,
        date_end: toIso(form.date_end ?? "") ?? null,
        description: form.description || undefined,
        location: form.location || undefined,
        instructor: form.instructor || undefined,
      };
      const saved = editingId !== null ? await edit(editingId, payload) : await add(payload);
      if (imageFile) {
        await uploadEventImage(saved.id, imageFile);
        loadAdmin();
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

  async function handleStatusChange(id: number, status: EventStatus) {
    try {
      await edit(id, { status });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Mise à jour impossible");
    }
  }

  function openParticipants(e: EventItem) {
    setParticipantsEvent(e);
    loadParticipants(e.id);
  }

  async function handleExportCsv() {
    if (!participantsEvent) return;
    setExporting(true);
    try {
      const blob = await exportEventRegistrations(participantsEvent.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inscriptions-evenement-${participantsEvent.id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export impossible");
    } finally {
      setExporting(false);
    }
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
                    : "Remplissez les informations du nouvel événement."}
                </p>
              </div>
              <button type="button" className={styles.formHeaderClose} onClick={cancelEdit} aria-label="Fermer">
                ✕
              </button>
            </div>

            <StepProgress current={step} />

            <form onSubmit={handleSubmit} className={styles.formBody}>
              {STEPS[step].id === "info" && (
                <div className={styles.grid2}>
                  <div className={styles.fullWidth}>
                    <Field label="Titre *">
                      <input
                        className={styles.input}
                        placeholder="ex. : Camp de jeunes d'été"
                        required
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                      />
                    </Field>
                  </div>

                  <Field label="Catégorie *">
                    <select
                      className={styles.select}
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      <option value="" disabled>Sélectionner…</option>
                      {categoryValues.map((c) => (
                        <option key={c.id} value={c.label}>{c.label}</option>
                      ))}
                    </select>
                  </Field>

                  <div className={styles.fullWidth}>
                    <Field label="Description">
                      <textarea
                        className={styles.textarea}
                        placeholder="Description de l'événement (optionnel)"
                        value={form.description ?? ""}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              )}

              {STEPS[step].id === "date" && (
                <div className={styles.grid2}>
                  <Field label="Date de début *">
                    <input
                      className={styles.input}
                      type="datetime-local"
                      required
                      value={form.date_start}
                      onChange={(e) => setForm({ ...form, date_start: e.target.value })}
                    />
                  </Field>

                  <Field label="Date de fin">
                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={form.date_end ?? ""}
                      onChange={(e) => setForm({ ...form, date_end: e.target.value })}
                    />
                  </Field>

                  <div className={styles.fullWidth}>
                    <Field label="Lieu">
                      <input
                        className={styles.input}
                        placeholder="ex. : Centre de plein air, Sainte-Adèle"
                        value={form.location ?? ""}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                      />
                    </Field>
                  </div>

                  <Field label="Église organisatrice">
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
                  </Field>

                  <Field label="District">
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
                  </Field>
                </div>
              )}

              {STEPS[step].id === "details" && (
                <div className={styles.grid2}>
                  <Field label="Formateur / animateur">
                    <input
                      className={styles.input}
                      placeholder="Surtout pour les formations"
                      value={form.instructor ?? ""}
                      onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                    />
                  </Field>

                  <Field label="Prix (CAD) — 0 = gratuit">
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.price ?? 0}
                      onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : 0 })}
                    />
                  </Field>

                  <Field label="Places maximum">
                    <input
                      className={styles.input}
                      type="number"
                      min={1}
                      placeholder="Vide = illimité"
                      value={form.capacity ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          capacity: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </Field>

                  <Field label="Statut">
                    <select
                      className={styles.select}
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}
                    >
                      {(Object.keys(STATUS_LABELS) as EventStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              {STEPS[step].id === "images" && (
                <div className={styles.imageStepBody}>
                  <Field label="Image de couverture">
                    <input
                      type="file"
                      accept="image/*"
                      className={styles.input}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (imagePreview && imagePreview.startsWith("blob:")) {
                          URL.revokeObjectURL(imagePreview);
                        }
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }}
                    />
                  </Field>
                  {imagePreview ? (
                    <div className={styles.imagePreviewWrap}>
                      <img src={imagePreview} alt="Aperçu de l'image de couverture" className={styles.imagePreview} />
                    </div>
                  ) : (
                    <p className={styles.imageHint}>Aucune image sélectionnée — formats acceptés : JPG, PNG, WebP.</p>
                  )}
                  {imageFile && (
                    <p className={styles.imageHint}>Cette image sera envoyée lors de l'enregistrement.</p>
                  )}
                </div>
              )}

              {STEPS[step].id === "review" && (
                <div className={styles.reviewList}>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Titre</span>
                    <span className={styles.reviewValue}>{form.title || "—"}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Catégorie</span>
                    <span className={styles.reviewValue}>{form.category || "—"}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Description</span>
                    <span className={styles.reviewValue}>{form.description || "—"}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Date de début</span>
                    <span className={styles.reviewValue}>{formatLocalDateTime(form.date_start)}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Date de fin</span>
                    <span className={styles.reviewValue}>{formatLocalDateTime(form.date_end)}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Lieu</span>
                    <span className={styles.reviewValue}>{form.location || "—"}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Église organisatrice</span>
                    <span className={styles.reviewValue}>{churchLabel(form.church_id ?? null)}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>District</span>
                    <span className={styles.reviewValue}>{form.district || "—"}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Formateur</span>
                    <span className={styles.reviewValue}>{form.instructor || "—"}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Prix</span>
                    <span className={styles.reviewValue}>{formatPrice(form.price ?? 0)}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Places maximum</span>
                    <span className={styles.reviewValue}>{form.capacity ?? "Illimité"}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Statut</span>
                    <span className={styles.reviewValue}>{STATUS_LABELS[form.status ?? "draft"]}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Image de couverture</span>
                    <span className={styles.reviewValue}>
                      {imagePreview ? (
                        <img src={imagePreview} alt="" className={styles.reviewImageThumb} />
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                </div>
              )}

              {formError && (
                <div className={styles.errorBanner} role="alert">
                  <span className={styles.errorBannerIcon}>⚠</span>
                  <span>{formError}</span>
                </div>
              )}

              <div className={styles.formActions}>
                {step > 0 && (
                  <Button type="button" variant="outline" onClick={goPrev} disabled={saving}>
                    ← Précédent
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving
                    ? "Enregistrement…"
                    : !isLastStep
                    ? "Suivant →"
                    : isEditing
                    ? "✓ Enregistrer les modifications"
                    : "+ Créer l'événement"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Onglets de vue ── */}
      <div className={styles.statusTabs} style={{ padding: "0 0 1rem" }}>
        <button
          type="button"
          className={view === "liste" ? `${styles.statusTab} ${styles.statusTabActive}` : styles.statusTab}
          onClick={() => setView("liste")}
        >
          📋 Liste
        </button>
        <button
          type="button"
          className={view === "statistiques" ? `${styles.statusTab} ${styles.statusTabActive}` : styles.statusTab}
          onClick={() => setView("statistiques")}
        >
          📊 Statistiques
        </button>
      </div>

      {view === "statistiques" ? (
        <EvenementsStatsPanel />
      ) : (
        <>
      {/* ── KPIs ── */}
      <div className={styles.kpiGrid}>
        <KpiCard color="violet" icon={<IconCalendar />} value={kpi.total} label="Total" />
        <KpiCard color="amber" icon={<IconFileEdit />} value={kpi.draft} label="Brouillons" />
        <KpiCard color="emerald" icon={<IconCheckCircle />} value={kpi.published} label="Publiés" />
        <KpiCard color="rose" icon={<IconXCircle />} value={kpi.cancelled} label="Annulés" />
      </div>

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
            <span className={styles.listCount}>{visibleEvents.length}</span>
          </p>
        </div>

        <div className={styles.statusTabs}>
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={statusTab === t.id ? `${styles.statusTab} ${styles.statusTabActive}` : styles.statusTab}
              onClick={() => setStatusTab(t.id)}
            >
              {t.label}
            </button>
          ))}
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
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); applyFilters({ category: e.target.value }); }}
          >
            <option value="">Toutes catégories</option>
            {categoryValues.map((c) => (
              <option key={c.id} value={c.label}>{c.label}</option>
            ))}
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

        {visibleEvents.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyIcon}>📅</p>
            <p className={styles.emptyText}>Aucun événement trouvé.</p>
          </div>
        ) : (
          <div className={styles.eventGrid}>
            {visibleEvents.map((e) => (
              <div
                key={e.id}
                className={`${styles.eventCard} ${editingId === e.id ? styles.eventCardEditing : ""} ${e.status !== "published" ? styles.eventCardInactive : ""}`}
              >
                <div className={`${styles.eventCardBand} ${e.status === "published" ? styles.eventCardBandPublished : ""}`} />
                <div className={styles.eventCardBody}>
                  <div className={styles.eventCardTop}>
                    <p className={styles.eventCardName}>{e.title}</p>
                    <span className={styles[STATUS_BADGE_CLASS[e.status]]}>{STATUS_LABELS[e.status]}</span>
                  </div>
                  <div className={styles.eventMeta}>
                    <div className={styles.eventMetaRow}>
                      <span className={styles.metaIcon}>🏷️</span>
                      <span className={styles.metaText}>{e.category}</span>
                    </div>
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
                    {e.instructor && (
                      <div className={styles.eventMetaRow}>
                        <span className={styles.metaIcon}>👤</span>
                        <span className={styles.metaText}>{e.instructor}</span>
                      </div>
                    )}
                    <div className={styles.eventMetaRow}>
                      <span className={styles.metaIcon}>⛪</span>
                      <span className={styles.metaText}>
                        {churchLabel(e.church_id)}{e.district ? ` · ${e.district}` : ""}
                      </span>
                    </div>
                    <div className={styles.eventMetaRow}>
                      <span className={styles.metaIcon}>💲</span>
                      <span className={styles.metaText}>{formatPrice(e.price)}</span>
                    </div>
                    <div className={styles.eventMetaRow}>
                      <span className={styles.metaIcon}>👥</span>
                      <span className={styles.metaText}>
                        {e.capacity !== null
                          ? `${e.registered_count} / ${e.capacity} inscrits`
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
                    <select
                      className={styles.filterSelect}
                      value={e.status}
                      onChange={(ev) => handleStatusChange(e.id, ev.target.value as EventStatus)}
                    >
                      {(Object.keys(STATUS_LABELS) as EventStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
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
        </>
      )}

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
              <div className={styles.participantsActions}>
                <Button type="button" variant="outline" onClick={handleExportCsv} disabled={exporting}>
                  {exporting ? "Export…" : "⬇ Exporter CSV"}
                </Button>
              </div>
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
                    <span className={styles.participantName}>{p.first_name} {p.last_name}</span>
                    <span className={styles.participantMeta}>
                      {p.email} · inscrit le{" "}
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
