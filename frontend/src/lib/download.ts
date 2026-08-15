/**
 * Déclenche le téléchargement d'un blob sous le nom voulu, puis libère l'URL
 * temporaire. Générique et sans logique métier : sa place est dans lib/.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
