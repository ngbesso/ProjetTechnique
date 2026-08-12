// Ajout et modification d'une église affiliée. Raison de changer : ce qu'on
// demande à l'administrateur et ce qu'on enregistre pour lui.
import { useState } from "react";
import { useChurches } from "../../../hooks/useChurches";
import { EMPTY_CHURCH } from "./churchDefaults";
import { churchToForm } from "./churchMapper";
import { hasFieldErrors, validateChurchContact } from "./churchValidation";
import type { ChurchFieldErrors } from "./churchValidation";
import type { Church, ChurchInput } from "../../../types";

type ChurchesApi = ReturnType<typeof useChurches>;

interface UseChurchEditorOptions {
  add: ChurchesApi["add"];
  edit: ChurchesApi["edit"];
  onSaved: (name: string, wasEditing: boolean) => void;
}

export function useChurchEditor({ add, edit, onSaved }: UseChurchEditorOptions) {
  const [form, setForm] = useState<ChurchInput>(EMPTY_CHURCH);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ChurchFieldErrors>({});

  function reset() {
    setEditingId(null);
    setForm(EMPTY_CHURCH);
    setError("");
    setFieldErrors({});
  }

  function openCreate() {
    reset();
    setOpen(true);
  }

  function openEdit(c: Church) {
    setEditingId(c.id);
    setForm(churchToForm(c));
    setError("");
    setFieldErrors({});
    setOpen(true);
  }

  function close() {
    reset();
    setOpen(false);
  }

  function update(patch: Partial<ChurchInput>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function clearFieldError(key: keyof ChurchFieldErrors) {
    setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
  }

  async function submit() {
    if (!form.name.trim()) return;

    const errs = validateChurchContact(form);
    setFieldErrors(errs);
    if (hasFieldErrors(errs)) return;

    setSaving(true);
    setError("");
    try {
      const payload = { ...form, name: form.name.trim() };
      const wasEditing = editingId !== null;
      if (editingId !== null) {
        await edit(editingId, payload);
      } else {
        await add(payload);
      }
      close();
      onSaved(payload.name, wasEditing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return {
    open,
    form,
    editingId,
    isEditing: editingId !== null,
    saving,
    error,
    fieldErrors,
    openCreate,
    openEdit,
    close,
    update,
    clearFieldError,
    submit,
  };
}
