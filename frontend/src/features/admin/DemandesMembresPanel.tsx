import { useEffect } from "react";
import styles from "./AdminPage.module.css";
import { hasPermission, useAuth } from "../../context/AuthContext";
import { useParameters } from "../../hooks/useParameters";
import { useToast } from "../../hooks/useToast";
import { DataTable } from "../../components/ui/DataTable";
import { IconCheckCircle, IconFileEdit } from "../../components/ui/icons";
import { KpiCard } from "../../components/ui/KpiCard";
import { IconInbox } from "./demandes/IconInbox";
import { MemberRequestFilters } from "./demandes/MemberRequestFilters";
import { MemberRequestModal } from "./demandes/MemberRequestModal";
import { memberRequestColumns } from "./demandes/memberRequestColumns";
import { useMemberRequests } from "./demandes/useMemberRequests";
import { useRequestEditor } from "./demandes/useRequestEditor";

export function DemandesMembresPanel() {
  const { user } = useAuth();
  const { values: types, load: loadTypes } = useParameters("member_request_type");
  const { toast, toasts } = useToast();

  const canManage = hasPermission(user, "member_request:manage");

  const list = useMemberRequests();
  const editor = useRequestEditor({
    onSaved: () => {
      list.reload();
      toast.success("Demande mise à jour.");
    },
    onFailure: (err) => toast.error(err, "Enregistrement impossible."),
  });

  const { load } = list;
  useEffect(() => {
    loadTypes();
    load();
  }, [loadTypes, load]);

  if (list.loading) return <p className={styles.stateMsg}>Chargement…</p>;

  return (
    <div className={styles.rbacWrapper}>
      {list.error && <p className={styles.errorMsg} role="alert">{list.error}</p>}

      {list.stats && (
        <div className={styles.kpiGrid}>
          <KpiCard color="amber" icon={<IconInbox />} value={list.stats.new} label="Nouvelles" />
          <KpiCard color="blue" icon={<IconFileEdit />} value={list.stats.in_progress} label="En cours" />
          <KpiCard color="emerald" icon={<IconCheckCircle />} value={list.stats.resolved} label="Résolues" />
          <KpiCard color="violet" icon={<IconInbox />} value={list.stats.total} label="Total" />
        </div>
      )}

      <section className={styles.listCard}>
        <div className={styles.listHeader}>
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>
            Demandes des membres ({list.requests.length})
          </h3>
        </div>

        <MemberRequestFilters types={types} onChange={list.load} />

        <div className={styles.listBody}>
          <DataTable
            columns={memberRequestColumns({ canManage, onHandle: editor.open })}
            data={list.requests}
            getRowId={(r) => r.id}
            emptyMessage="Aucune demande."
          />
        </div>
      </section>

      {editor.request && (
        <MemberRequestModal
          request={editor.request}
          status={editor.status}
          onStatusChange={editor.setStatus}
          response={editor.response}
          onResponseChange={editor.setResponse}
          error={editor.error}
          saving={editor.saving}
          onClose={editor.close}
          onSave={editor.save}
        />
      )}
      {toasts}
    </div>
  );
}
