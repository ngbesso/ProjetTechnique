import { useRef, useState } from "react";
import styles from "../AdminPage.module.css";
import { downloadAttachment } from "./expenseAttachment";
import type { Expense } from "../../../types";

interface AttachmentCellProps {
  expense: Expense;
  onUpload: (expenseId: number, file: File) => Promise<void>;
}

/**
 * Téléchargement du justificatif existant, ou dépôt d'un nouveau. Chaque ligne
 * gère son propre champ caché : rien à tenir au niveau du panneau.
 */
export function AttachmentCell({ expense, onUpload }: AttachmentCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (expense.attachment_url) {
    return (
      <button
        type="button"
        className={styles.btnOutlineSm}
        onClick={() => downloadAttachment(expense)}
      >
        📎 {expense.attachment_name ?? "Télécharger"}
      </button>
    );
  }

  async function handleChange(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(expense.id, file);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.btnOutlineSm}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "…" : "+ Ajouter"}
      </button>
      <input
        ref={inputRef}
        type="file"
        style={{ display: "none" }}
        onChange={(e) => handleChange(e.target.files?.[0] ?? null)}
      />
    </>
  );
}
