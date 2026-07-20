import { Fragment, useState } from "react";
import styles from "./ChatWidget.module.css";
import { askAssistant, type ChatSource } from "../../lib/api/aiChat";

interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: ChatSource[];
}

const SOURCE_ICONS: Record<ChatSource["type"], string> = {
  post: "📝",
  sermon: "🎙",
  event: "📅",
  church: "⛪",
  info: "ℹ️",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await askAssistant(question);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.answer, sources: res.sources },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <div>
              <p className={styles.headerTitle}>Assistant Mission Évangélique</p>
              <p className={styles.headerSubtitle}>Questions sur nos sermons et articles</p>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div className={styles.messages}>
            {messages.length === 0 && (
              <p className={styles.emptyState}>
                Posez une question sur nos sermons ou nos articles de blog — l'assistant
                répond à partir du contenu déjà publié sur le site.
              </p>
            )}
            {messages.map((m, i) => (
              <Fragment key={i}>
                <div className={`${styles.bubble} ${m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant}`}>
                  {m.text}
                </div>
                {m.sources && m.sources.length > 0 && (
                  <div className={styles.sources}>
                    {m.sources.map((s, j) => (
                      <span key={j} className={styles.sourceTag}>
                        {SOURCE_ICONS[s.type]} {s.title}
                      </span>
                    ))}
                  </div>
                )}
              </Fragment>
            ))}
            {loading && <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>…</div>}
          </div>

          {error && <p className={styles.errorMsg} role="alert">{error}</p>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              className={styles.input}
              placeholder="Votre question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className={styles.sendBtn} disabled={loading || !input.trim()} aria-label="Envoyer">
              ➤
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className={styles.launcher}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant"}
      >
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}
