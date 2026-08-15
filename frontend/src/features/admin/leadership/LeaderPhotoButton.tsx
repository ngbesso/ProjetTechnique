import { useRef, useState } from "react";
import adminStyles from "../AdminPage.module.css";

interface LeaderPhotoButtonProps {
  onUpload: (file: File) => Promise<void>;
}

/**
 * Envoi de la photo d'une fiche. Chaque ligne gère son propre champ caché :
 * inutile de tenir un registre de références au niveau du panneau.
 */
export function LeaderPhotoButton({ onUpload }: LeaderPhotoButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <button
        className={adminStyles.btnOutlineSm}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Envoi…" : "Photo"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleChange(e.target.files?.[0] ?? null)}
      />
    </>
  );
}
