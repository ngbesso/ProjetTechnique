import { useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useParameters } from "../../hooks/useParameters";
import { useConfirm } from "../../hooks/useConfirm";
import { fetchSettings, updateSetting } from "../../lib/api/settings";
import type { AppSetting } from "../../types";

// ── Intégrations (Zeffy, etc.) ────────────────────────────────────────────────

function IntegrationsPanel() {
    const [zeffyPath, setZeffyPath] = useState("");
    const [draft, setDraft] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchSettings()
            .then((list) => {
                const val = list.find((s) => s.key === "zeffy_embed_path")?.value ?? "";
                setZeffyPath(val);
                setDraft(val);
            })
            .catch(() => {});
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError("");
        setSaved(false);
        try {
            await updateSetting("zeffy_embed_path", draft.trim());
            setZeffyPath(draft.trim());
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
            <h3 className={styles.cardTitle}>Intégration Zeffy</h3>
            <p style={{ fontSize: ".875rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
                Chemin du formulaire de don Zeffy. Exemple&nbsp;:{" "}
                <code style={{ fontSize: ".8rem", background: "#f3f4f6", padding: "0 .3rem", borderRadius: 4 }}>
                    /fr/donation-form/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                </code>
            </p>
            <form onSubmit={handleSave} className={styles.inlineForm}>
                <input
                    className={styles.input}
                    style={{ flex: 1, fontFamily: "monospace", fontSize: ".875rem" }}
                    placeholder="/fr/donation-form/..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                />
                <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={saving || draft.trim() === zeffyPath}
                >
                    {saving ? "…" : "Enregistrer"}
                </button>
            </form>
            {saved && <p style={{ color: "var(--vivid-violet)", fontSize: ".875rem", marginTop: ".5rem" }}>Enregistré ✓</p>}
            {error && <p className={styles.errorMsg} role="alert">{error}</p>}
        </section>
    );
}

// ── Listes de valeurs (sexe / statut matrimonial / districts) ────────────────

const SECTIONS = [
    { category: "sexe", label: "Sexe" },
    { category: "family_status", label: "Statut matrimonial" },
    { category: "district", label: "Districts" },
    { category: "donation_category", label: "Catégories de don" },
] as const;

type Category = typeof SECTIONS[number]["category"];

interface CategoryEditorProps {
    category: Category;
    title: string;
}

function CategoryEditor({ category, title }: CategoryEditorProps) {
    const { values, loading, error, load, add, rename, remove } = useParameters(category);
    const { confirm, dialog } = useConfirm();
    const [newLabel, setNewLabel] = useState("");
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editLabel, setEditLabel] = useState("");

    useEffect(() => { load(); }, [load]);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        const label = newLabel.trim();
        if (!label) return;
        setAdding(true);
        setAddError("");
        try {
            await add(label);
            setNewLabel("");
        } catch (err) {
            setAddError(err instanceof Error ? err.message : "Erreur");
        } finally {
            setAdding(false);
        }
    }

    function startEdit(id: number, label: string) {
        setEditingId(id);
        setEditLabel(label);
    }

    async function handleRename(e: React.FormEvent, id: number) {
        e.preventDefault();
        const label = editLabel.trim();
        if (!label) return;
        try {
            await rename(id, label);
            setEditingId(null);
        } catch (err) {
            setAddError(err instanceof Error ? err.message : "Erreur");
        }
    }

    async function handleDelete(id: number, label: string) {
        const ok = await confirm({
            title: `Supprimer « ${label} » ?`,
            confirmLabel: "Supprimer",
            variant: "danger",
        });
        if (!ok) return;
        try {
            await remove(id);
        } catch (err) {
            setAddError(err instanceof Error ? err.message : "Erreur de suppression");
        }
    }

    return (
        <section className={styles.card}>
            <h3 className={styles.cardTitle}>{title}</h3>

            <form onSubmit={handleAdd} className={styles.inlineForm} style={{ marginBottom: "1rem" }}>
                <input
                    className={styles.input}
                    placeholder={`Nouveau : ${title.toLowerCase()}…`}
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                />
                <button type="submit" className={styles.btnPrimary} disabled={adding || !newLabel.trim()}>
                    {adding ? "…" : "+ Ajouter"}
                </button>
            </form>

            {(error || addError) && (
                <p className={styles.errorMsg} role="alert">{error || addError}</p>
            )}

            {loading ? (
                <p className={styles.stateMsg}>Chargement…</p>
            ) : values.length === 0 ? (
                <p className={styles.empty}>Aucune valeur configurée.</p>
            ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: ".5rem" }}>
                    {values.map((v) => (
                        <li key={v.id} style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                            {editingId === v.id ? (
                                <form onSubmit={(e) => handleRename(e, v.id)} className={styles.inlineForm} style={{ flex: 1 }}>
                                    <input
                                        className={styles.input}
                                        value={editLabel}
                                        autoFocus
                                        onChange={(e) => setEditLabel(e.target.value)}
                                    />
                                    <button type="submit" className={styles.btnPrimary}>Sauver</button>
                                    <button type="button" className={styles.btnGhost} onClick={() => setEditingId(null)}>Annuler</button>
                                </form>
                            ) : (
                                <>
                                    <span style={{ flex: 1 }}>{v.label}</span>
                                    <button className={styles.btnOutlineSm} onClick={() => startEdit(v.id, v.label)}>
                                        Renommer
                                    </button>
                                    <button className={styles.btnDanger} onClick={() => handleDelete(v.id, v.label)}>
                                        Supprimer
                                    </button>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {dialog}
        </section>
    );
}

// ── Options système (toggles) ─────────────────────────────────────────────────

function OptionsPanel() {
    const [appSettings, setAppSettings] = useState<AppSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchSettings()
            .then((list) => setAppSettings(list.filter((s) => s.value === "true" || s.value === "false")))
            .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
            .finally(() => setLoading(false));
    }, []);

    async function toggle(key: string, current: string) {
        const next = current === "true" ? "false" : "true";
        setSavingKey(key);
        setError("");
        try {
            const updated = await updateSetting(key, next);
            setAppSettings((prev) => prev.map((s) => (s.key === key ? updated : s)));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur");
        } finally {
            setSavingKey(null);
        }
    }

    return (
        <section className={styles.card}>
            <h3 className={styles.cardTitle}>Options d'inscription</h3>
            {error && <p className={styles.errorMsg} role="alert">{error}</p>}
            {loading ? (
                <p className={styles.stateMsg}>Chargement…</p>
            ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {appSettings.map((s) => {
                        const enabled = s.value === "true";
                        const busy = savingKey === s.key;
                        return (
                            <li key={s.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                                <div>
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: ".9rem", color: "var(--text-main)" }}>
                                        {s.description}
                                    </p>
                                    <p style={{ margin: ".2rem 0 0", fontSize: ".78rem", color: "var(--text-muted)" }}>
                                        {enabled
                                            ? "Les nouvelles demandes sont approuvées instantanément."
                                            : "Les nouvelles demandes passent en attente de validation manuelle."}
                                    </p>
                                </div>
                                <button
                                    role="switch"
                                    aria-checked={enabled}
                                    disabled={busy}
                                    onClick={() => toggle(s.key, s.value)}
                                    style={{
                                        flexShrink: 0,
                                        width: 48,
                                        height: 26,
                                        borderRadius: 999,
                                        border: "none",
                                        background: enabled ? "var(--vivid-violet)" : "#d1d5db",
                                        cursor: busy ? "not-allowed" : "pointer",
                                        position: "relative",
                                        transition: "background .2s",
                                        opacity: busy ? 0.6 : 1,
                                    }}
                                >
                                    <span style={{
                                        position: "absolute",
                                        top: 3,
                                        left: enabled ? 25 : 3,
                                        width: 20,
                                        height: 20,
                                        borderRadius: "50%",
                                        background: "#fff",
                                        boxShadow: "0 1px 3px rgba(0,0,0,.3)",
                                        transition: "left .2s",
                                    }} />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

// ── Panel principal ───────────────────────────────────────────────────────────

export function ParametresPanel() {
    return (
        <div className={styles.rbacWrapper}>
            <OptionsPanel />
            <IntegrationsPanel />
            <p style={{ color: "var(--text-muted)", fontSize: ".875rem", margin: "0 0 1rem" }}>
                Ces valeurs alimentent les menus déroulants des formulaires (adhésion, profil, églises).
            </p>
            {SECTIONS.map(({ category, label }) => (
                <CategoryEditor key={category} category={category} title={label} />
            ))}
        </div>
    );
}
