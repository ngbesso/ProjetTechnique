import { useState } from "react";
import styles from "./AdminPage.module.css";
import { askAdminAssistant } from "../../lib/api/adminChat";
import { downloadAdminReport } from "../../lib/api/reports";

interface Message {
  role: "user" | "assistant";
  text: string;
  usedStats?: string[];
}

const STAT_LABELS: Record<string, string> = {
  membres: "Membres",
  dons: "Dons",
  evenements: "Événements",
  sermons: "Sermons",
  articles: "Blog",
  eglises: "Églises",
};

const FORMAT_LABELS: Record<string, string> = {
  excel: "Excel (.xlsx)",
  word: "Word (.docx)",
  pdf: "PDF",
};

const FORMAT_EXTENSIONS: Record<string, string> = {
  excel: "xlsx",
  word: "docx",
  pdf: "pdf",
};

export function AssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [reportDomain, setReportDomain] = useState("membres");
  const [reportFormat, setReportFormat] = useState("excel");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await askAdminAssistant(question);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.answer, usedStats: res.used_stats },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadReport() {
    setReportLoading(true);
    setReportError("");
    try {
      const blob = await downloadAdminReport(reportDomain, reportFormat);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport-${reportDomain}.${FORMAT_EXTENSIONS[reportFormat]}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Téléchargement impossible.");
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <>
    <div className={styles.card}>
      <p className={styles.cardTitle}>Assistant IA — Questions sur les données</p>

      <div className={styles.assistantMessages}>
        {messages.length === 0 && (
          <p className={styles.empty}>
            Posez une question sur les membres, les dons, les événements et formations,
            les sermons, le blog ou les Églises affiliées — la réponse est basée sur les
            statistiques actuelles de la plateforme.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={styles.assistantBlock}>
            <div
              className={`${styles.assistantBubble} ${
                m.role === "user" ? styles.assistantBubbleUser : styles.assistantBubbleReply
              }`}
            >
              {m.text}
            </div>
            {m.usedStats && m.usedStats.length > 0 && (
              <p className={styles.assistantStats}>
                Basé sur : {m.usedStats.map((s) => STAT_LABELS[s] ?? s).join(", ")}
              </p>
            )}
          </div>
        ))}
        {loading && (
          <div className={`${styles.assistantBubble} ${styles.assistantBubbleReply}`}>…</div>
        )}
      </div>

      {error && (
        <p className={styles.errorMsg} role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className={styles.inlineForm}>
        <input
          className={styles.input}
          placeholder="Ex. : Combien de dons avons-nous reçus ce mois-ci ?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className={styles.btnPrimary}
          disabled={loading || !input.trim()}
        >
          {loading ? "…" : "Envoyer"}
        </button>
      </form>
    </div>

    <div className={styles.card}>
      <p className={styles.cardTitle}>Générer un rapport</p>
      <div className={styles.inlineForm}>
        <select
          className={styles.select}
          value={reportDomain}
          onChange={(e) => setReportDomain(e.target.value)}
          disabled={reportLoading}
        >
          {Object.entries(STAT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          value={reportFormat}
          onChange={(e) => setReportFormat(e.target.value)}
          disabled={reportLoading}
        >
          {Object.entries(FORMAT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={handleDownloadReport}
          disabled={reportLoading}
        >
          {reportLoading ? "Génération…" : "Télécharger"}
        </button>
      </div>
      {reportError && (
        <p className={styles.errorMsg} role="alert">
          {reportError}
        </p>
      )}
    </div>
    </>
  );
}
