// Dépôt et modification d'un sermon. Raison de changer : ce qu'on demande au
// responsable de la médiathèque et ce qu'on enregistre pour lui.
import { useState } from "react";
import { useSermons } from "../../../hooks/useSermons";
import { EMPTY_SERMON } from "./sermonDefaults";
import type { Sermon, SermonInput } from "../../../types";

type SermonsApi = ReturnType<typeof useSermons>;

function missingIdentity(form: SermonInput): boolean {
  return !form.title.trim() || !form.preacher.trim() || !form.sermon_date;
}

export function useCreateSermon(add: SermonsApi["add"], onSaved: (title: string) => void) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SermonInput>(EMPTY_SERMON);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openModal() {
    setForm(EMPTY_SERMON);
    setFile(null);
    setError("");
    setOpen(true);
  }

  function update(patch: Partial<SermonInput>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function submit() {
    if (missingIdentity(form) || !file) {
      setError("Titre, prédicateur, date et fichier sont requis.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await add(form, file);
      const savedTitle = form.title.trim();
      setForm(EMPTY_SERMON);
      setFile(null);
      setOpen(false);
      onSaved(savedTitle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setSaving(false);
    }
  }

  return {
    open,
    form,
    saving,
    error,
    openModal,
    close: () => setOpen(false),
    update,
    setFile,
    submit,
  };
}

export function useEditSermon(
  edit: SermonsApi["edit"],
  replaceMedia: SermonsApi["replaceMedia"],
  onSaved: (title: string) => void,
) {
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [form, setForm] = useState<SermonInput>(EMPTY_SERMON);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function open(s: Sermon) {
    setSermon(s);
    setForm({
      title: s.title,
      preacher: s.preacher,
      sermon_date: s.sermon_date,
      description: s.description ?? "",
      series: s.series ?? "",
      status: s.status,
    });
    setFile(null);
    setError("");
  }

  function update(patch: Partial<SermonInput>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function submit() {
    if (!sermon) return;
    if (missingIdentity(form)) {
      setError("Titre, prédicateur et date sont requis.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await edit(sermon.id, {
        title: form.title,
        preacher: form.preacher,
        sermon_date: form.sermon_date,
        description: form.description || undefined,
        series: form.series || undefined,
        status: form.status,
      });
      if (file) {
        await replaceMedia(sermon.id, file);
      }
      setSermon(null);
      onSaved(form.title.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  }

  return {
    sermon,
    form,
    saving,
    error,
    open,
    close: () => setSermon(null),
    update,
    setFile,
    submit,
  };
}
