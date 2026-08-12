import { useCallback, useEffect, useState } from "react";
import styles from "./AdminPage.module.css";
import { useParameters } from "../../hooks/useParameters";
import { exportMinistryMembers } from "../../lib/api/ministryAffiliations";
import { downloadBlob } from "../../lib/download";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { AddMembersCard } from "./ministeres/AddMembersCard";
import { MinistryMembersCard } from "./ministeres/MinistryMembersCard";
import { MinistryReport } from "./ministeres/MinistryReport";
import { useMinistryMembers } from "./ministeres/useMinistryMembers";
import type { MinistryMember } from "../../types";

export function MinisteresPanel() {
  const [mode, setMode] = useState<"gestion" | "rapport">("gestion");
  const { values: ministries, load: loadMinistries } = useParameters("ministry");
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const { confirm, dialog } = useConfirm();
  const { toast, toasts } = useToast();

  const onFailure = useCallback(
    (err: unknown, fallback: string) => toast.error(err, fallback),
    [toast],
  );
  const onRemoved = useCallback((message: string) => toast.success(message), [toast]);

  const members = useMinistryMembers({
    ministry: selected,
    onError: setError,
    onRemoved,
    onFailure,
  });

  useEffect(() => { loadMinistries(); }, [loadMinistries]);

  useEffect(() => {
    if (ministries.length > 0 && !selected) setSelected(ministries[0].label);
  }, [ministries, selected]);

  async function handleRemoveOne(m: MinistryMember) {
    const name = `${m.first_name} ${m.last_name}`;
    const ok = await confirm({
      title: `Retirer ${name} du ministère « ${selected} » ?`,
      description: "Le membre reste inscrit, seule son affiliation à ce ministère est retirée.",
      confirmLabel: "Retirer",
      variant: "danger",
    });
    if (!ok) return;
    await members.removeMany([m], `${name} retiré du ministère.`);
  }

  async function handleRemoveSelected() {
    const targets = members.members.filter((m) => members.selectedIds.has(m.id));
    if (targets.length === 0) return;
    const ok = await confirm({
      title: `Retirer ${targets.length} membre(s) du ministère « ${selected} » ?`,
      description: "Les membres restent inscrits, seule leur affiliation à ce ministère est retirée.",
      confirmLabel: "Retirer",
      variant: "danger",
    });
    if (!ok) return;
    await members.removeMany(targets, `${targets.length} membre(s) retiré(s) du ministère.`);
  }

  async function handleExportCsv() {
    if (!selected) return;
    setExporting(true);
    setError("");
    try {
      downloadBlob(await exportMinistryMembers(selected), `membres-${selected}.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export impossible");
    } finally {
      setExporting(false);
    }
  }

  const restriction = ministries.find((m) => m.label === selected)?.restricted_to_sexe ?? null;

  return (
    <div className={styles.rbacWrapper}>
      <div className={styles.toolbar}>
        <button
          className={mode === "gestion" ? styles.btnPrimarySm : styles.btnOutlineSm}
          onClick={() => setMode("gestion")}
        >
          Gestion
        </button>
        <button
          className={mode === "rapport" ? styles.btnPrimarySm : styles.btnOutlineSm}
          onClick={() => setMode("rapport")}
        >
          Rapport
        </button>
      </div>

      {mode === "rapport" ? (
        <MinistryReport
          onSelectMinistry={(ministry) => { setSelected(ministry); setMode("gestion"); }}
        />
      ) : (
        <>
          <MinistryMembersCard
            ministries={ministries}
            selected={selected}
            onSelect={setSelected}
            exporting={exporting}
            onExport={handleExportCsv}
            error={error}
            members={members}
            onRemoveOne={handleRemoveOne}
            onRemoveSelected={handleRemoveSelected}
          />

          {selected && (
            <AddMembersCard
              ministry={selected}
              restriction={restriction}
              currentIds={new Set(members.members.map((m) => m.id))}
              onAdded={(count) => {
                members.reload();
                toast.success(`${count} membre(s) ajouté(s) au ministère.`);
              }}
              onError={setError}
            />
          )}
        </>
      )}
      {dialog}
      {toasts}
    </div>
  );
}
