// Rédaction d'une fiche de leadership, à la création comme à la modification.
// Raison de changer : ce qu'on demande au responsable et ce qu'on enregistre.
import { useState } from "react";
import { useLeaders } from "../../../hooks/useLeaders";
import { EMPTY_LEADER } from "./leaderDefaults";
import { leaderToForm, leaderToPayload } from "./leaderMapper";
import type { Leader, LeaderInput } from "../../../types";

type LeadersApi = ReturnType<typeof useLeaders>;

interface UseLeaderEditorOptions {
  add: LeadersApi["add"];
  edit: LeadersApi["edit"];
  onSaved: (name: string, wasEditing: boolean) => void;
}

export function useLeaderEditor({ add, edit, onSaved }: UseLeaderEditorOptions) {
  const [form, setForm] = useState<LeaderInput>(EMPTY_LEADER);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_LEADER);
    setError("");
    setOpen(true);
  }

  function openEdit(l: Leader) {
    setEditingId(l.id);
    setForm(leaderToForm(l));
    setError("");
    setOpen(true);
  }

  function close() {
    setEditingId(null);
    setForm(EMPTY_LEADER);
    setError("");
    setOpen(false);
  }

  function update(patch: Partial<LeaderInput>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function submit() {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.title.trim()) {
      setError("Prénom, nom et titre sont requis.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = leaderToPayload(form);
      const wasEditing = editingId !== null;
      if (editingId !== null) {
        await edit(editingId, payload);
      } else {
        await add(payload);
      }
      close();
      onSaved(`${payload.first_name} ${payload.last_name}`, wasEditing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return {
    open,
    form,
    isEditing: editingId !== null,
    saving,
    error,
    openCreate,
    openEdit,
    close,
    update,
    submit,
  };
}
