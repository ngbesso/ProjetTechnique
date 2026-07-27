import { useRef, useState } from "react";
import styles from "./AdminPage.module.css";
import { downloadImportTemplate, importMembers } from "../../lib/api/members";
import type { Church, MemberImportResult } from "../../types";

interface ImportSectionProps {
    churches: Church[];
    onImported: () => void;
}

export function MemberImportSection({ churches, onImported }: ImportSectionProps) {
    const [churchId, setChurchId] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<MemberImportResult | null>(null);
    const [error, setError] = useState("");
    const [templateError, setTemplateError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleDownloadTemplate() {
        setTemplateError("");
        try {
            await downloadImportTemplate();
        } catch (err) {
            setTemplateError(err instanceof Error ? err.message : "Erreur lors du téléchargement");
        }
    }

    async function handleImport(e: React.FormEvent) {
        e.preventDefault();
        if (!churchId || !file) return;
        setImporting(true);
        setError("");
        setResult(null);
        try {
            const res = await importMembers(+churchId, file);
            setResult(res);
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            onImported();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur lors de l'import");
        } finally {
            setImporting(false);
        }
    }

    return (
        <section className={styles.card}>
            <h3 className={styles.cardTitle}>Importer des membres</h3>
            <p className={styles.helpText}>
                Fichier Excel (.xlsx) ou CSV avec les colonnes <code>first_name, last_name, email</code> (requises) et
                optionnellement <code>address, birth_date, sexe, telephone, family_status, conversion_date, is_baptized</code>.
                Les membres importés sont créés directement en statut actif.{" "}
                <button type="button" className={styles.btnGhost} style={{ padding: 0 }}
                    onClick={handleDownloadTemplate}>
                    Télécharger le modèle Excel
                </button>
            </p>
            {templateError && <p className={styles.errorMsg} role="alert">{templateError}</p>}
            <form onSubmit={handleImport} className={styles.inlineForm} style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                <select className={styles.select} value={churchId}
                    onChange={(e) => setChurchId(e.target.value)} required>
                    <option value="">Église…</option>
                    {churches.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}{c.is_mother ? " (mère)" : ""}</option>
                    ))}
                </select>
                <input ref={fileInputRef} className={styles.input} type="file"
                    accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <button type="submit" className={styles.btnPrimary} disabled={importing || !churchId || !file}>
                    {importing ? "Import en cours…" : "Importer"}
                </button>
            </form>

            {error && <p className={styles.errorMsg} role="alert" style={{ marginTop: "0.75rem" }}>{error}</p>}

            {result && (
                <div style={{ marginTop: "0.9rem" }}>
                    <p style={{ fontSize: "0.875rem" }}>
                        <strong>{result.created}</strong> membre{result.created > 1 ? "s" : ""} créé{result.created > 1 ? "s" : ""}
                        {result.errors.length > 0 && <> · <strong>{result.errors.length}</strong> erreur{result.errors.length > 1 ? "s" : ""}</>}
                    </p>
                    {result.errors.length > 0 && (
                        <table className={styles.table} style={{ marginTop: "0.5rem" }}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Ligne</th>
                                    <th className={styles.th}>Courriel</th>
                                    <th className={styles.th}>Erreur</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.errors.map((e, i) => (
                                    <tr key={i}>
                                        <td className={styles.td}>{e.row}</td>
                                        <td className={styles.td}>{e.email ?? "—"}</td>
                                        <td className={styles.td}>{e.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </section>
    );
}
