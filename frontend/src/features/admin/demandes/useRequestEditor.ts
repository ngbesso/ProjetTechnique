// Traitement d'une demande : statut et réponse au membre. Raison de changer :
// ce qu'un responsable peut décider d'une demande.
import { useState } from "react";
import { updateMemberRequest } from "../../../lib/api/memberRequests";
import type { MemberRequestAdmin, MemberRequestStatus } from "../../../types";

interface UseRequestEditorOptions {
  onSaved: () => void;
  onFailure: (err: unknown) => void;
}

export function useRequestEditor({ onSaved, onFailure }: UseRequestEditorOptions) {
  const [request, setRequest] = useState<MemberRequestAdmin | null>(null);
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<MemberRequestStatus>("resolved");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /** Une demande déjà résolue le reste ; sinon elle passe « en cours ». */
  function open(r: MemberRequestAdmin) {
    setRequest(r);
    setResponse(r.admin_response ?? "");
    setStatus(r.status === "resolved" ? "resolved" : "in_progress");
    setError("");
  }

  async function save() {
    if (!request) return;
    setSaving(true);
    setError("");
    try {
      await updateMemberRequest(request.id, {
        status,
        admin_response: response.trim() || undefined,
      });
      setRequest(null);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
      onFailure(err);
    } finally {
      setSaving(false);
    }
  }

  return {
    request,
    response,
    setResponse,
    status,
    setStatus,
    saving,
    error,
    open,
    close: () => setRequest(null),
    save,
  };
}
