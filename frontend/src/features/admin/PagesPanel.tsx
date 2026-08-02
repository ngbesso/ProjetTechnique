import { useEffect, useRef, useState } from "react";
import styles from "./AdminPage.module.css";
import { TemplateSettingField } from "./ParametresPanel";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { fetchChurches, updateChurch } from "../../lib/api/churches";
import { fetchSettings, updateSetting } from "../../lib/api/settings";
import {
  fetchMenuAdmin,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  uploadSiteLogo,
  deleteSiteLogo,
  siteLogoUrl,
} from "../../lib/api/content";
import type { Church, MenuItem } from "../../types";

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

// ── Nous joindre (coordonnées du pied de page) ───────────────────────────────

/** Les coordonnées affichées dans le pied de page sont celles de l'église mère
 *  (SiteFooter lit motherChurch.address/phone/email). Ce bloc édite donc ce
 *  même enregistrement via l'API churches, plutôt que d'introduire un réglage
 *  parallèle qui divergerait de la fiche Église. */
function ContactBlock() {
  const [church, setChurch] = useState<Church | null>(null);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchChurches()
      .then((list) => {
        const mother = list.find((c) => c.is_mother) ?? null;
        setChurch(mother);
        setAddress(mother?.address ?? "");
        setPhone(mother?.phone ?? "");
        setEmail(mother?.email ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const dirty =
    !!church &&
    (address.trim() !== (church.address ?? "") ||
      phone.trim() !== (church.phone ?? "") ||
      email.trim() !== (church.email ?? ""));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!church) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await updateChurch(church.id, {
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      setChurch(updated);
      setAddress(updated.address ?? "");
      setPhone(updated.phone ?? "");
      setEmail(updated.email ?? "");
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
      <h3 className={styles.cardTitle}>Nous joindre</h3>
      <p style={{ fontSize: ".875rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
        Coordonnées affichées dans le pied de page du site public.
      </p>

      {loading ? (
        <p className={styles.stateMsg}>Chargement…</p>
      ) : !church ? (
        <p className={styles.errorMsg} role="alert">Église mère introuvable.</p>
      ) : (
        <form onSubmit={handleSave}>
          <div className={styles.formGrid}>
            <input
              className={styles.input}
              placeholder="Adresse"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <input
              className={styles.input}
              type="tel"
              placeholder="Téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className={styles.input}
              type="email"
              placeholder="Courriel"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div style={{ marginTop: "1rem" }}>
            <button type="submit" className={styles.btnPrimary} disabled={saving || !dirty}>
              {saving ? "…" : "Enregistrer"}
            </button>
          </div>
        </form>
      )}

      <p className={styles.helpText}>
        Ces coordonnées sont celles de l'église mère
        {church ? ` (${church.name})` : ""} — elles sont également modifiables depuis le
        panneau Églises, et toute modification ici s'y reflète.
      </p>
      {saved && (
        <p style={{ color: "var(--vivid-violet)", fontSize: ".875rem", marginTop: ".5rem" }}>
          Enregistré ✓
        </p>
      )}
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
  const { toast, toasts } = useToast();

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
      toast.success(`Entrée « ${label} » renommée.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      toast.error(err, "Modification impossible.");
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
      toast.success(`Entrée « ${item.label} » retirée du menu.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de suppression");
      toast.error(err, "Suppression impossible.");
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
      {toasts}
    </section>
  );
}

// ── Logo du site ───────────────────────────────────────────────────────────────

function LogoUploader() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog } = useConfirm();
  const { toast, toasts } = useToast();

  useEffect(() => {
    fetchSettings()
      .then((list) => {
        const val = list.find((s) => s.key === "site_logo_url")?.value ?? "";
        setLogoUrl(siteLogoUrl(val));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Le fichier doit être une image.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await uploadSiteLogo(file);
      setLogoUrl(siteLogoUrl(res.site_logo_url));
      toast.success("Logo mis à jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de téléversement");
      toast.error(err, "Téléversement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    const ok = await confirm({
      title: "Supprimer le logo du site ?",
      description: "L'en-tête du site public reprendra l'icône générique.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    setError("");
    try {
      await deleteSiteLogo();
      setLogoUrl(null);
      toast.success("Logo supprimé.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de suppression");
      toast.error(err, "Suppression impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Logo du site</h3>
      <p style={{ fontSize: ".875rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
        Affiché dans l'en-tête du site public. Sans logo, une icône générique est utilisée.
      </p>

      {loading ? (
        <p className={styles.stateMsg}>Chargement…</p>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 8,
              background: "var(--vivid-violet)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo du site" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              <span style={{ color: "#fff", fontWeight: 700, fontSize: "1.3rem" }}>+</span>
            )}
          </div>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <button type="button" className={styles.btnOutlineSm} disabled={saving} onClick={() => inputRef.current?.click()}>
              {logoUrl ? "Changer" : "Téléverser"}
            </button>
            {logoUrl && (
              <button type="button" className={styles.btnDanger} disabled={saving} onClick={handleRemove}>
                Supprimer
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </div>
      )}
      {error && <p className={styles.errorMsg} role="alert" style={{ marginTop: ".75rem" }}>{error}</p>}
      {dialog}
      {toasts}
    </section>
  );
}

// ── Panel principal ───────────────────────────────────────────────────────────

// Les 4 statistiques du hero de la page d'accueil (valeur + libellé chacune).
const HERO_STATS = [1, 2, 3, 4] as const;

export function PagesPanel() {
  return (
    <div className={styles.rbacWrapper}>
      <ContactBlock />
      <LogoUploader />
      <SettingTextField settingKey="site_name" title="Nom du site" description="Affiché dans l'en-tête et le pied de page." />
      <SettingTextField settingKey="site_tagline" title="Slogan" description="Affiché sous le nom du site, dans l'en-tête." />

      <SettingTextField settingKey="hero_eyebrow" title="Accueil — petit texte du hero" description="Court texte au-dessus du grand titre de la page d'accueil." />
      <SettingTextField settingKey="hero_title" title="Accueil — titre principal" description="Grand titre de la page d'accueil." />
      <TemplateSettingField settingKey="hero_subtitle" title="Accueil — sous-titre" description="Texte sous le grand titre de la page d'accueil." />

      <p className={styles.sectionLabel}>Accueil — statistiques</p>
      <p className={styles.helpNote}>
        Dans le champ <em>valeur</em>, {"{eglises}"} et {"{membres}"} sont remplacés à
        l'affichage par les comptages réels de la base (églises affiliées, membres actifs).
        Toute autre saisie est affichée telle quelle, par exemple «&nbsp;40 ans&nbsp;».
        Laisser la valeur vide masque la statistique.
      </p>
      {HERO_STATS.map((n) => (
        <div key={n}>
          <SettingTextField
            settingKey={`hero_stat${n}_value`}
            title={`Statistique ${n} — valeur`}
            description="Chiffre mis en avant dans la bande du hero. Laisser vide pour masquer cette statistique."
            placeholder="120+"
          />
          <SettingTextField
            settingKey={`hero_stat${n}_label`}
            title={`Statistique ${n} — libellé`}
            description="Texte affiché sous le chiffre."
            placeholder="Églises affiliées"
          />
        </div>
      ))}

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
