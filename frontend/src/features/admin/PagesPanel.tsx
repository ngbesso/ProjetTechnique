import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { TemplateSettingField } from "./ParametresPanel";
import { useConfirm } from "../../hooks/useConfirm";
import { fetchSettings, updateSetting } from "../../lib/api/settings";
import {
  fetchMenuAdmin,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../../lib/api/content";
import type { MenuItem } from "../../types";

const TARGET_PAGE_LABELS: Record<string, string> = {
  home: "Accueil",
  leadership: "Leadership",
  sermons: "Sermons",
  blog: "Blog",
  actualites: "Actualités",
  evenements: "Événements",
  donation: "Faire un don",
  adhesion: "Devenir membre",
  login: "Se connecter",
};

// ── Champ une-ligne (nom du site, slogan, URLs sociales) ──────────────────────

interface SettingTextFieldProps {
  settingKey: string;
  title: string;
  description: string;
  placeholder?: string;
}

function SettingTextField({ settingKey, title, description, placeholder }: SettingTextFieldProps) {
  const [value, setValue] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSettings()
      .then((list) => {
        const val = list.find((s) => s.key === settingKey)?.value ?? "";
        setValue(val);
        setDraft(val);
      })
      .catch(() => {});
  }, [settingKey]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateSetting(settingKey, trimmed);
      setValue(trimmed);
      setDraft(trimmed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>{title}</h3>
      <p style={{ fontSize: ".875rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
        {description}
      </p>
      <form onSubmit={handleSave} className={styles.inlineForm}>
        <input
          className={styles.input}
          style={{ flex: 1 }}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className={styles.btnPrimary} disabled={saving || draft.trim() === value}>
          {saving ? "…" : "Enregistrer"}
        </button>
      </form>
      {saved && <p style={{ color: "var(--vivid-violet)", fontSize: ".875rem", marginTop: ".5rem" }}>Enregistré ✓</p>}
      {error && <p className={styles.errorMsg} role="alert">{error}</p>}
    </section>
  );
}

// ── Menu principal (réordonnable) ─────────────────────────────────────────────

function MenuManager() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newTarget, setNewTarget] = useState("home");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const { confirm, dialog } = useConfirm();

  function load() {
    setLoading(true);
    fetchMenuAdmin()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    setAdding(true);
    setError("");
    try {
      await createMenuItem({ label, target_page: newTarget, position: items.length });
      setNewLabel("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAdding(false);
    }
  }

  async function toggleVisible(item: MenuItem) {
    try {
      await updateMenuItem(item.id, { is_visible: !item.is_visible });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const a = items[index];
    const b = items[target];
    try {
      await Promise.all([
        updateMenuItem(a.id, { position: b.position }),
        updateMenuItem(b.id, { position: a.position }),
      ]);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id);
    setEditLabel(item.label);
  }

  async function handleRename(e: React.FormEvent, id: number) {
    e.preventDefault();
    const label = editLabel.trim();
    if (!label) return;
    try {
      await updateMenuItem(id, { label });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleTargetChange(id: number, target_page: string) {
    try {
      await updateMenuItem(id, { target_page });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleDelete(item: MenuItem) {
    const ok = await confirm({
      title: `Supprimer « ${item.label} » du menu ?`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteMenuItem(item.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de suppression");
    }
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Menu principal</h3>
      <p style={{ fontSize: ".875rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
        Ordre, libellé et page cible des liens affichés dans la barre de navigation du site public.
        Une entrée masquée reste configurée mais n'apparaît plus dans le menu.
      </p>

      {error && <p className={styles.errorMsg} role="alert">{error}</p>}

      {loading ? (
        <p className={styles.stateMsg}>Chargement…</p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>Aucune entrée de menu configurée.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>
          {items.map((item, index) => (
            <li key={item.id} style={{ display: "flex", alignItems: "center", gap: ".5rem", opacity: item.is_visible ? 1 : 0.55 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <button className={styles.btnOutlineSm} disabled={index === 0} onClick={() => move(index, -1)} title="Monter">▲</button>
                <button className={styles.btnOutlineSm} disabled={index === items.length - 1} onClick={() => move(index, 1)} title="Descendre">▼</button>
              </div>

              {editingId === item.id ? (
                <form onSubmit={(e) => handleRename(e, item.id)} className={styles.inlineForm} style={{ flex: 1 }}>
                  <input className={styles.input} value={editLabel} autoFocus onChange={(e) => setEditLabel(e.target.value)} />
                  <button type="submit" className={styles.btnPrimary}>Sauver</button>
                  <button type="button" className={styles.btnGhost} onClick={() => setEditingId(null)}>Annuler</button>
                </form>
              ) : (
                <span style={{ flex: 1, fontWeight: 600 }}>{item.label}</span>
              )}

              <select
                className={styles.select}
                value={item.target_page}
                onChange={(e) => handleTargetChange(item.id, e.target.value)}
              >
                {Object.entries(TARGET_PAGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              <button className={styles.btnOutlineSm} onClick={() => toggleVisible(item)}>
                {item.is_visible ? "Masquer" : "Afficher"}
              </button>
              {editingId !== item.id && (
                <button className={styles.btnOutlineSm} onClick={() => startEdit(item)}>Renommer</button>
              )}
              <button className={styles.btnDanger} onClick={() => handleDelete(item)}>Supprimer</button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className={styles.inlineForm}>
        <input
          className={styles.input}
          placeholder="Libellé du nouveau lien…"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <select className={styles.select} value={newTarget} onChange={(e) => setNewTarget(e.target.value)}>
          {Object.entries(TARGET_PAGE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button type="submit" className={styles.btnPrimary} disabled={adding || !newLabel.trim()}>
          {adding ? "…" : "+ Ajouter"}
        </button>
      </form>

      {dialog}
    </section>
  );
}

// ── Panel principal ───────────────────────────────────────────────────────────

export function PagesPanel() {
  return (
    <div className={styles.rbacWrapper}>
      <SettingTextField settingKey="site_name" title="Nom du site" description="Affiché dans l'en-tête et le pied de page." />
      <SettingTextField settingKey="site_tagline" title="Slogan" description="Affiché sous le nom du site, dans l'en-tête." />

      <SettingTextField settingKey="hero_eyebrow" title="Accueil — petit texte du hero" description="Court texte au-dessus du grand titre de la page d'accueil." />
      <SettingTextField settingKey="hero_title" title="Accueil — titre principal" description="Grand titre de la page d'accueil." />
      <TemplateSettingField settingKey="hero_subtitle" title="Accueil — sous-titre" description="Texte sous le grand titre de la page d'accueil." />

      <SettingTextField settingKey="about_eyebrow" title="Qui sommes-nous — petit texte" description="Court texte au-dessus du titre de la section « Qui sommes-nous »." />
      <SettingTextField settingKey="about_title" title="Qui sommes-nous — titre" description="Titre de la section « Qui sommes-nous »." />
      <TemplateSettingField settingKey="about_description" title="Qui sommes-nous — description" description="Paragraphe de présentation de la mission." />

      <SettingTextField settingKey="social_youtube_url" title="Lien YouTube" description="Laisser vide pour masquer l'icône dans le pied de page." placeholder="https://youtube.com/@..." />
      <SettingTextField settingKey="social_facebook_url" title="Lien Facebook" description="Laisser vide pour masquer l'icône dans le pied de page." placeholder="https://facebook.com/..." />
      <SettingTextField settingKey="social_instagram_url" title="Lien Instagram" description="Laisser vide pour masquer l'icône dans le pied de page." placeholder="https://instagram.com/..." />
      <SettingTextField settingKey="social_whatsapp_url" title="Lien WhatsApp" description="Laisser vide pour masquer l'icône dans le pied de page." placeholder="https://wa.me/..." />

      <MenuManager />
    </div>
  );
}
